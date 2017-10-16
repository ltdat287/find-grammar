var express = require('express'),
    bodyParser = require('body-parser'),
    http = require('http'),
    request = require('request'),
    app = express(),
    token = 'EAAcFzb1LzGYBAD14cWx7wkKHyZC5IGdBXaZAbaSqAov3Vp9NtPH0DzZCx119CcihCcgsGnPq7kf0LzTTunbN6gWjwPHpFzAcWTI5eECCvVF09B3CUZB94Jv8HylgZBRDYKUtrf2jpGPtcENFZAtApkVflHi8yQYjvdCiss2ZCEZAtQZDZD',
    ludwig_authorization = '7od3nksdi414r5uvaulgk8s7jkuuhlk1pdbcbbsvcf5ch8ajlhr3',
    ludwig_uri = 'https://api.ludwig.guru/ludwig-authentication-manager/rest/v1.0/search';

app.use(bodyParser.json({}));

app.messageHandler = function (j, cb) {
    var sender_id = j.entry[0].messaging[0].sender.id;
    var question = j.entry[0].messaging[0].message.text;

    // Get infor user sender
    var reqInfoUser = {
        method: 'GET',
        url: 'https://graph.facebook.com/v2.6/' + sender_id,
        qs: {
            fields: 'first_name,last_name,profile_pic,gender,locale,timezone',
            access_token: token
        }
    };

    request(reqInfoUser, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', JSON.stringify(error));
        } else if (response.body.error) {
            console.log("API Error: " + JSON.stringify(response.body.error));
        } else {
            console.log(body);
        }
    });

    // Do search question in ludwig.io
    var reqSearchQuestion = {
        method: 'GET',
        url: ludwig_uri,
        headers: {
            "Authorization": ludwig_authorization,
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36"
        },
        qs: {
            q: question
        }
    };

    console.log(JSON.stringify(reqSearchQuestion));
    request(reqSearchQuestion, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', JSON.stringify(error));
        } else if (response.body.error) {
            console.log("API Error: " + JSON.stringify(response.body.error));
        } else {
            var answer = JSON.parse(body);
            if (typeof answer.ResultDescription !== 'undefined') {
                var text = answer.ResultDescription.message;
                var data = {
                    "recipient": {
                        "id": sender_id
                    },
                    "message": {
                        "text": text
                    }
                };

                var reqObj = {
                    url: 'https://graph.facebook.com/v2.6/me/messages',
                    qs: {access_token: token},
                    method: 'POST',
                    json: data
                };

                console.log(JSON.stringify(reqObj))
                request(reqObj, function (err, res) {
                    if (err) {
                        console.log('Error sending message: ', JSON.stringify(err));
                        cb(false)
                    } else if (res.body.error) {
                        console.log("API Error: " + JSON.stringify(response.body.error));
                        cb(false)
                    } else {
                        cb(true)
                    }
                });
            }
        }
    });
}

app.post('/fb', function (req, res) {
    console.log(JSON.stringify(req.body))
    app.messageHandler(req.body, function (result) {
        console.log("Async Handled: " + result)
    })

    res.send(req.body)
})
app.get('/fb', function (req, res) {
    if (req.query['hub.verify_token'] === 'abc') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

// create a health check endpoint
app.get('/health', function (req, res) {
    res.send('okay');
});

// set port
app.set('port', process.env.PORT || 5000);

// start the server
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});