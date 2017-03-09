var http = require('http');
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var server = http.createServer(app);
var schedule = require('node-schedule');
var firebase = require("firebase");

var auth = require('./auth');
var serviceapi = require('./serviceapi');
var pushmysql = require('./pushmysql');
var config = require('./config');

firebase.initializeApp(config.firebase.options);

schedule.scheduleJob('*/3 * * * * *', pushmysql.syncCounter);
schedule.scheduleJob('*/3 * * * * *', pushmysql.syncNotification);
schedule.scheduleJob('*/5 * * * * *', pushmysql.cacheCounterSetValue);

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 30 * 86400 * 1000 },
  proxy: true,
  resave: true,
  saveUninitialized: true
}));

app.get('/',function(request, response) {
    response.end('Hello World！');
});

app.post('/v1/login', auth.login_v1);
app.post('/changePassword', auth.changePassword);

app.get('/listActiveCounter', serviceapi.listActiveCounter);
app.get('/listTrade', serviceapi.listTrade);
app.get('/listAccountMargin', serviceapi.listAccountMargin);
app.get('/listOpenPosition', serviceapi.listOpenPosition);
app.get('/listOpenPositionByCondition', serviceapi.listOpenPositionByCondition);
app.get('/listAllOpenPosition', serviceapi.listAllOpenPosition);
app.get('/listAccountMarginByRollover', serviceapi.listAccountMarginByRollover);
app.get('/listSettledPositionByRollover', serviceapi.listSettledPositionByRollover);
app.get('/getTradingDay', serviceapi.getTradingDay);
app.get('/getAccountSummary', serviceapi.getAccountSummary);
app.get('/listTradeQueue', serviceapi.listTradeQueue);

app.post('/tradeWithCheck', serviceapi.tradeWithCheck);
app.post('/trade', serviceapi.trade);
app.post('/cancelTrade', serviceapi.cancelTrade);
app.post('/setNotificationClient', serviceapi.setNotificationClient);

server.listen(8100,'0.0.0.0',function(){
    console.log('HTTP server running on http://0.0.0.0:8100/ ');
});
