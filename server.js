#!/bin/env node
var express = require('express');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var MongoStore = require('connect-mongo')(expressSession);
var db = require('./db').getDB();
var dbUrl = require('./db').settings().url;
var collection = 'users';
var validateSubmission = require('./validate').validate;
var submitEntry = require('./submit');
var drawWinner = require('./winner').draw;
var redrawWinner = require('./winner').redraw;
var drawTime = process.env.EVENT_DRAW || '3.30pm on Friday';
var appSecret = process.env.OPENSHIFT_SECRET_TOKEN || 'local';
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(function(username, password, done) {
    if (!db) return done('DB error');
    db[collection].find({'username': username}, function (err, userList) {
        if (err) return done(err);
        if (!userList[0] || userList[0].password != password) {
            return done(null, false, { message: 'Invalid login.' });
        }
        return done(null, userList[0]);
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(userId, done) {
    if (!db) return done('DB error');
    db[collection].find({'id': userId}, function(err, userList) { 
        done(err, userList[0]); 
    });
});

var StackEm = function () {

    var self = this;

    self.setupVariables = function () {
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    self.terminator = function (sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };

    self.setupTerminationHandlers = function () {
        process.on('exit', function () { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    self.createRoutes = function () {
        self.routes = { };

        self.routes['/'] = function (req, res) {
            res.redirect('/blocks'); 
        }

        self.routes['GET/blocks'] = function (req, res) {
            res.sendfile(__dirname + '/views/blocks.html');
        }

        self.routes['GET/entry'] = function (req, res) {
            res.sendfile(__dirname + '/views/entry.html');
        }

        self.routes['/login'] = function (req, res) {
            var schema = req.headers['x-forwarded-proto'];
            if (process.env.OPENSHIFT_APP_NAME && schema !== 'https') {
                res.redirect('https://' + req.headers.host + '/login'); 
            } 
            res.sendfile(__dirname + '/views/login.html');
        }

        self.routes['/logout'] = function (req, res) {
            req.logout();
            res.redirect('/');
        }

        self.routes['/blocks'] = function (req, res) {
            if (!req.body) return res.status(400).send('invalid request');
            validateSubmission(req.body, function (err, code) {
                if (err) return res.status(400).send(err);
                return res.status(200).send(code);
            }); 
        };

        self.routes['/entry'] = function (req, res) {
            submitEntry(req.body.name, req.body.company, req.body.email, req.body.entry, function (err, result) {
                if (err) {
                    return res.status(400).render('error', { error: err });
                } else if (result == 'unique') {
                    return res.status(200).render('result', { unique: 'unique', chances: 'two chances', draw: drawTime });
                } else {
                    return res.status(200).render('result', { unique: 'not unique', chances: 'one chance', draw: drawTime });
                }
            });
        };

        self.routes['GET/winner'] = function (req, res) {
            res.sendfile(__dirname + '/views/winner.html');
        }

        self.routes['/winner'] = function (req, res) {
            if (req.body.redraw) {
                redrawWinner(function (err, winner) {
                    if (err) {
                        console.log('Redraw error: ' + JSON.stringify(err));
                        res.status(400).send('internal error'); 
                    }
                    return res.status(200).send(winner);
                });
            } else {
                drawWinner(function (err, winner) {
                    if (err) {
                        console.log('Draw error: ' + JSON.stringify(err));
                        res.status(400).send('internal error'); 
                    }
                    return res.status(200).send(winner);
                });
            }
        };
    };

    self.loggedIn = function (req, res, next) {
        var schema = req.headers['x-forwarded-proto'];
        if (process.env.OPENSHIFT_APP_NAME && schema !== 'https') {
            res.redirect('https://' + req.headers.host + (req.headers.path ? req.headers.path : '/')); 
        } 
        if (req.user && req.isAuthenticated()) return next();
        return res.redirect('/login');
    }

    self.initializeServer = function () {
        self.app = express();
        self.createRoutes();
        self.app.use(express.static(__dirname + '/public'));
        self.app.use(cookieParser(appSecret));
        self.app.use(bodyParser.urlencoded({ extended: false }));
        self.app.use(bodyParser.json());
        self.app.use(expressSession({ secret: appSecret, 
                                      saveUninitialized: true, 
                                      resave: false,
                                      store: new MongoStore({ url: dbUrl }) }));
        self.app.use(passport.initialize());
        self.app.use(passport.session());
        self.app.set('views', __dirname + '/views');
        self.app.set('view engine', 'jade');
        self.app.get('/', self.routes['/']);
        self.app.get('/login', self.routes['/login']);
        self.app.post('/login', passport.authenticate('local', { successRedirect: '/blocks',
                                                                 failureRedirect: '/login' }));
        self.app.get('/logout', self.loggedIn, self.routes['/logout']);
        self.app.get('/blocks', self.loggedIn, self.routes['GET/blocks']);
        self.app.post('/blocks', self.loggedIn, self.routes['/blocks']);
        self.app.get('/entry', self.loggedIn, self.routes['GET/entry']);
        self.app.post('/entry', self.loggedIn, self.routes['/entry']);
        self.app.get('/winner', self.loggedIn, self.routes['GET/winner']);
        self.app.post('/winner', self.loggedIn, self.routes['/winner']);
    };

    self.initialize = function () {
        self.setupVariables();
        self.setupTerminationHandlers();
        self.initializeServer();
    };

    self.start = function () {
        self.app.listen(self.port, self.ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };
}; 

var app = new StackEm();
app.initialize();
app.start();
