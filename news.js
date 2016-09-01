const http = require('http');
const fs = require('fs');
const os = require('os');
const cluster = require('cluster');
const EventEmitter = require('events').EventEmitter;
const mysql=require('mysql')
const urlLib=require('url');

var cpus=os.cpus().length;

if(cluster.isMaster){
    for(var i=0;i<cpus;i++){
        cluster.fork();
    }
    cluster.on('exit', function () {
        cluster.fork()
    })
}else{
    var E=new EventEmitter();
    http.createServer(function (req, res) {
        E.emit('get-parse',req,res);
    }).listen(8080);
    E.on('get-parse', function (req, res) {
        req.get=urlLib.parse(req.url,true).query;
        req.url=urlLib.parse(req.url,true).pathname;

        E.emit('buss-on',req,res);
    })
    E.on('buss-on', function (req, res) {

        var bool=E.emit(req.url,req,res);
        if(bool == false){
            E.emit('read-file',req,res);
        }
    })
    E.on('read-file', function (req, res) {
        //页面
        var rs=fs.createReadStream('www'+req.url);
        rs.pipe(res);
        rs.on('error', function () {
            res.writeHeader(404);
            res.write('404');
            res.end();
        })
    })
    //以下处理接口
    E.on('/news', function (req, res) {
        var act=req.get.act;

        switch (act){
            case 'add':
                E.emit('news-add',req,res);
                break;
            case 'get':
                E.emit('news-get',req,res);
                break;
        }
    })
    E.on('news-add', function (req,res) {
        var title=req.get.title;
        var href=req.get.href;

        //连接数据库
        var db=mysql.createConnection({
            host:       'localhost',
            user:       'root',
            password:   'root',
            database:   'user'
        })
        //var sql='INSERT INTO news VALUES(null,"'+title+'","'+href+'")';
        var sql=`INSERT INTO news VALUES(null,"${title}","${href}")`;//es6字符串拼接 `"${str}"`
        db.query(sql, function (err, data) {
            if(err){
                res.end(JSON.stringify({err:1001,msg:"数据库方面问题"}))
            }else{
                res.end(JSON.stringify({err:1002,msg:"添加新闻成功"}))
            }
        })
    })
    E.on('news-get', function (req, res) {
        var db=mysql.createConnection({
            host:       'localhost',
            user:       'root',
            password:   'root',
            database:   'user'
        })
        var sql=`SELECT title,href FROM news`;
        db.query(sql, function (err, data) {
            if(err){
                res.end(JSON.stringify({err:1001,msg:"数据库方面问题"}))
            }else{
                res.end(JSON.stringify({err:1002,msg:"获取新闻成功",data:data}))
            }
        })
    })

}