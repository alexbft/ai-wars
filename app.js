
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , utils = require('./utils')
//, connect = require('connect');

var app = module.exports = express.createServer();

// Configuration

app.configure(function () {
    app.set('views', __dirname + '/ui');
    app.use(express.logger('tiny'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: require('./server').sessionKey }));
    app.use(express.methodOverride());
    //app.use(connect.compress());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

utils.debug = app.settings.env == 'development';

// Routes

app.get('/', routes.auth, routes.page('index'));
//app.get(/^\/(\w+)$/, routes.auth, routes.page());
app.get(/^\/(.+)\/$/, function (req, res) {
    res.redirect('/' + req.params[0]);
});

app.get('/index', routes.auth, routes.page('index'));
app.get('/challenges', routes.auth, routes.page('challenges'));
app.get('/login', routes.auth, routes.page('login'));
app.get('/register', routes.auth, routes.page('register'));
app.get('/replays', routes.auth, routes.page('replays'));
app.get('/scores', routes.auth, routes.page('scores'));
app.get('/news', routes.auth, routes.page('news'));
app.get('/about', routes.auth, routes.page('about'));
app.get('/about/adm', routes.auth, routes.page('about_adm'));

app.get(/^\/challenges\/(\w+)$/, routes.auth, routes.page('challenge'));
app.get(/^\/challenges\/(\w+)\/practice$/, routes.auth, routes.page('practice'));
app.get(/^\/challenges\/(\w+)\/adm$/, routes.auth, routes.page('challenge_adm'));
app.get(/^\/challenges\/(\w+)\/contests$/, routes.auth, routes.page('contests'));
app.get(/^\/contests\/(\w+)$/, routes.auth, routes.page('contest'));
app.get(/^\/replays\/(\w+)$/, routes.auth, routes.page('replay'));
app.get(/^\/sources\/(\w+)$/, routes.auth, routes.page('source'));

app.all(/^\/ajax\/(\w+)$/, routes.auth, routes.ajax);
app.get('/js/scripts.js', routes.scripts);
app.get('/css/styles.css', routes.css);

app.listen(80);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

process.on('uncaughtException', function (err) {
  console.log(err.stack);
});
