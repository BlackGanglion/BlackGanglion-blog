var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var settings = require('./settings');
var flash = require('connect-flash');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var multer  = require('multer');

var app = express();

app.use(express.compress());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(flash());
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//session
app.use(session({
  secret: settings.cookieSecret,
  key: settings.db,
  //12h后session和相应的cookie失效过期
  cookie: {maxAge: 1000 * 60 * 60 * 12},
  store: new MongoStore({
    db: settings.db,
    host: settings.host,
    port: settings.port
  })
}));

routes(app);

module.exports = app;
