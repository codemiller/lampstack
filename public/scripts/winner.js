$('#draw').click(function() {
    $.ajax({
        url: window.location.origin + "/winner", 
        type: "post", 
        contentType: "application/json",
        success: function (data, textStatus) {
            if (textStatus != "success") {
                updateWinner('Internal error', '');
            } else {
                updateWinner(data.name, data.email);
            }
        },
        error: function(jqxhr, textStatus, errorThrown) {
            updateWinner('Internal error', '');
        }
    });
});

$('#redraw').click(function() {
    $.ajax({
        url: window.location.origin + "/winner", 
        type: "post",
        data: JSON.stringify({'redraw': true }),
        contentType: "application/json",
        success: function (data, textStatus) {
            if (textStatus != "success") {
                updateWinner('Internal error', '');
            } else {
                updateWinner(data.name, data.email);
            }
        },
        error: function(jqxhr, textStatus, errorThrown) {
            updateWinner('Internal error', '');
        }
    });
});

var updateWinner = function (name, email) {
    $('#winnerName').html(name);
    $('#winnerEmail').html(email);
};

