$('.block').draggable({ containment: '#playspace', scroll: false, snap: '#playspace', grid: [50,50] });

$('.block').not('#yellow').dblclick(function () {
    var colour = $(this).attr('id');
    var current = $(this).children('.active')[0];
    var num = parseInt($(current).attr('id').substring(colour.length));
    var targets = $(this).children('#' + colour + (num+1));
    var target = targets.length == 1 ? targets[0] : $(this).children('#' + colour + 1); 
    $(current).removeClass('active');
    $(current).addClass('inactive');
    $(target).removeClass('inactive');
    $(target).addClass('active');
    $(this).css('height', $(target).children('svg').attr('height'));
    $(this).css('width', $(target).children('svg').attr('width'));
    $(this).draggable({ containment: '#playspace', scroll: false, snap: '#playspace', grid: [50,50] });
});

$('#submit').click(function() {
    var blue = $('#blue');
    var xoffset = getX(blue);
    var yoffset = getY(blue);
    var submission = [];
    submission.push(blockSummary('blue', 0, 0, getRotation(blue)));
    $('.block').not('#blue').each(function () {
        var x = getX(this) - xoffset;
        var y = yoffset - getY(this);
        submission.push(blockSummary($(this).attr('id'), x, y, getRotation(this)));
    });
    var payload = JSON.stringify({ "blocks": submission });
    $.ajax({
        url: window.location.origin + "/blocks", 
        type: "post", 
        data: payload, 
        contentType: "application/json",
        dataType: "text",
        success: function (data, textStatus) {
            if (textStatus != "success") {
                alert("Submission invalid. Please try again.");
            } else {
                $(location).attr("href", window.location.origin + "/entry?sub=" + data);
            }
        },
        error: function(jqxhr, textStatus, errorThrown) {
            alert('Submission invalid: ' + jqxhr.responseText + '. Please try again.');
        }
    });
});

var blockSummary = function (colour, x, y, rotation) {
    return { "col": colour, "x": x, "y": y, "rot": rotation };
}

var getRotation = function (elem) {
    return getIntVal($(elem).children('.active')[0].id.substring($(elem).attr('id').length));
}

var getX = function (elem) {
    return getIntVal($(elem).css('left'));
}

var getY = function (elem) {
    return getIntVal($(elem).css('top'));
}

var getIntVal = function (str) {
    return parseInt(str, 10);
}
