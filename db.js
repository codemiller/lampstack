var cc = require('config-multipaas');
var mongojs = require('mongojs');
var config = cc({ 
    db_name : process.env.OPENSHIFT_APP_NAME || '/lampstack'
})
var db_config = config.get('MONGODB_DB_URL');
var db_name = config.get('db_name');
var entryCollection = 'entries';
var submissionCollection = 'submissions';
var userCollection = 'users';
var db = mongojs(db_config + db_name, [entryCollection, submissionCollection, userCollection]);

db.on('error', function(err) {
    console.log('Database error: ', err);
});

var get_db = function () {
    return db;
};

var init_db = function () {
    console.log('Setting indices');
    db[entryCollection].ensureIndex({'submission': 1}, function (err, doc) {
        if (err) { console.log(err); }
        db[entryCollection].ensureIndex({'email': 1}, { 'unique': true}, function (err, doc) {
            if (err) { console.log(err); }
            db[submissionCollection].ensureIndex({'code': 1}, function (err, doc) {
                if (err) { console.log(err); }
                return db.close();
            });
        });
    });
};

var get_settings = function () {
    return { db: config.get('db_name'),
             host: config.get('HOSTNAME'),
             port: config.get('PORT'),
             url: config.get('MONGODB_DB_URL') + config.get('db_name')
    };
};

module.exports = exports = {
    initDB: init_db,
    getDB: get_db,
    settings: get_settings
};
