var db = require('./db').getDB();
var collection = 'entries';
var validateSubmissionCode = require('./validate').validateCode;
var city = process.env.EVENT_CITY || 'Melbourne';

module.exports = function (name, company, email, submission, cb) {
    if (!name || !company || !email || !submission) return cb('missing parameter');
    validateSubmissionCode(submission, function (err) {
        // Validate submission
        if (err) return cb('invalid game submission');

        db[collection].find({'email': email, 'city': city}, function (err, emailDocs) {
            if (err) return cb('internal error');
            // Check email is unique
            if (emailDocs.length > 0) return cb('entrant already registered');

            db[collection].find({'city': city, 'submission': submission}, function (err, subDocs) {
                if (err) return cb('internal error');
                // Check if submission is unique for this city
                var unique = subDocs.length == 0;

                db[collection].insert({'submission': submission, 
                                            'name': name, 
                                            'company': company, 
                                            'email': email, 
                                            'unique': unique, 
                                            'city': city,
                                            'status': 'undrawn',
                                            'entryTime': new Date()}, 
                                            function (err, result) {
                    if (err) {
                        console.log('DB insert failure: ' + JSON.stringify(err));
                        return cb('internal error');
                    }
                    return cb(null, unique ? 'unique' : 'notunique');
                });
            });
        }); 
    });
};
