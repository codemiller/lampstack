#!/bin/env node
var db = require('./db').getDB();
var collection = 'entries';
var city = process.env.EVENT_CITY || 'Melbourne';

var draw_winner = function (cb) {
    var barrel = [];
    db[collection].find({'city':city, 'status':'undrawn'}, function (err, entries) {
        if (err) return cb('internal error');
        barrel = barrel.concat(entries);
        db[collection].find({'city':city, 'status':'undrawn', 'unique':true}, function (error, uniqueEntries) {
            if (error) return cb('internal error');
            barrel = barrel.concat(uniqueEntries);
            if (barrel.length == 0) return cb('internal error');
            var winner = barrel[Math.floor(Math.random()*barrel.length)];
            console.log('Winner: ' + winner.email);
            db[collection].findAndModify({
                query: { 'email': winner.email }, 
                update: { $set: { 'status': 'winner', 'winTime': new Date() }}}, function (errr) {
                if (errr) return cb('internal error');
                return cb(null, { 'name': winner.name, 'email': winner.email });
            });
        });
    });
};

var redraw_winner = function (cb) {
    db[collection].find({'status': 'winner'}).sort({'winTime': -1}, function (err, winners) {
        if (err) {
            console.log('Redraw error: ' + err);
            return cb('internal error');
        }
        db[collection].findAndModify({
          query: { 'email': winners[0].email }, 
          update: { $set: { 'status': 'drawn' }}}, function (errr) {
            if (errr) return cb('internal error');
            return draw_winner(cb);
        });
    });
};

module.exports = exports = {
    draw: draw_winner,
    redraw: redraw_winner 
};
