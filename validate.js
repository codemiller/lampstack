var db = require('./db').getDB();
var collection = 'submissions';
var blockColours = ['blue','ginger','green','orange','pink','purple','yellow'];
var blockPositions = {
    'blue' : [[{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}], 
              [{x: 0, y: 0}, {x: 0, y: -1}, {x: 0, y: -2}, {x: 0, y: -3}]],
    'ginger': [[{x: 0, y: -1}, {x: 1, y: -1}, {x: 2, y: 0}, {x: 2, y: -1}],
               [{x: 0, y: 0}, {x: 0, y: -1}, {x: 0, y: -2}, {x: 1, y: -2}], 
               [{x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 2, y: 0}], 
               [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 1, y: -2}]],
    'green': [[{x: 0, y: -1}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: -1}],
              [{x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: -2}]],
    'orange': [[{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 2, y: -1}],
              [{x: 0, y: -1}, {x: 0, y: -2}, {x: 1, y: 0}, {x: 1, y: -1}]],
    'pink': [[{x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: -1}, {x: 2, y: -1}],
             [{x: 0, y: 0}, {x: 0, y: -1}, {x: 0, y: -2}, {x: 1, y: 0}], 
             [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 2, y: -1}], 
             [{x: 0, y: -2}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 1, y: -2}]],
    'purple': [[{x: 0, y: -1}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 2, y: -1}],
               [{x: 0, y: 0}, {x: 0, y: -1}, {x: 0, y: -2}, {x: 1, y: -1}], 
               [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 2, y: 0}], 
               [{x: 0, y: -1}, {x: 1, y: 0}, {x: 1, y: -1}, {x: 1, y: -2}]],
    'yellow': [[{x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 1, y: -1}]]
};

var calculateCode = function (blocks, cb) {
    if (!blocks) return cb('invalid input');
    var points = [];
    var result = '';
    for (var b = 0; b < blockColours.length; b++) {
        var blockColour = blockColours[b];
        var block = blocks.filter(function (b) { return b.col == blockColour })[0];
        var topleftx = Math.round(block.x / 50);
        var toplefty = Math.round(block.y / 50);
        var offsets = blockPositions[blockColour][block.rot-1];
        if (!offsets || offsets.length != 4) return cb('invalid input');;
        for (var o = 0; o < offsets.length; o++) {
            var offset = offsets[o];
            var point = { x: topleftx + offset.x, y: toplefty + offset.y, col: blockColour };
            if (points.filter(function (p) { return p.x == point.x && p.y == point.y }).length != 0) {
                console.log('Overlapping block found: ' + JSON.stringify(point));
                console.log(blocks);
                return cb('overlapping blocks'); 
            }
            points.push(point);
        };
        result += (topleftx + offsets[0].x + 20) + '' + (toplefty + offsets[0].y + 20) + '' + block.rot;  
    }
    var connected = ['blue'];
    var toProcess = ['blue'];
    while (toProcess.length != 0 && connected.length != 7) {
        var colour = toProcess.shift();
        var blockPoints = points.filter(function (p) { return p.col == colour });
        blockPoints.forEach(function (point) {
            var connectionPoints = points.filter(function (p) {
                return p.col != point.col &&
                  ((p.x == point.x && 
                     (p.y == point.y + 1 ||
                      p.y == point.y - 1)) ||
                   (p.y == point.y &&
                      (p.x == point.x + 1 ||
                       p.x == point.x - 1)));
            });
            connectionPoints.forEach(function (p) {
                if (connected.indexOf(p.col) == -1) {
                    connected.push(p.col);
                    if (toProcess.indexOf(p.col) == -1) toProcess.push(p.col);
                }
            });
        });
    }
    if (connected.length != 7) {
        return cb('disconnected blocks');
    }
    console.log('Submission code: ' + result); 
    return cb(null, result);
};

var validate = function (input, cb) {
    if (!input || !input.blocks || input.blocks.length != 7) return cb('invalid input');
    var validColours = input.blocks.every(function (blockEntry) {
        return blockColours.indexOf(blockEntry.col != -1);
    });
    if (!validColours) return cb('invalid input');
    
    calculateCode(input.blocks, function (err, code) {
        if (err) return cb(err);
        db[collection].insert({ 'code': code, 'submission': input.blocks }, function (err, result) {
            if (err) {
                console.log('DB submission insert failure: ' + JSON.stringify(err));
                return cb('invalid');
            }
            return cb(null, code); 
        });
    }); 
};

var validate_code = function (code, cb) {
    var codeString = code + ''; 
    db[collection].find({'code': codeString}, function (err, docs) {
        if (err) {
            console.log(JSON.stringify(err));
            return cb('invalid');
        }
        if (docs.length < 1) return cb('invalid');
        return cb(null, 'valid');
    });
};

module.exports = exports = {
    validateCode: validate_code,
    validate: validate 
};
