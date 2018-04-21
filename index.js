var express = require('express');
var game = require('./game.js');
var app = express();
var http = require('http').Server(app);

app.use(express.static('static'));

app.get('/', function(req, res){
	res.sendFile('index.html');
});

game.Server(http, 8080, './level.txt');

var server = http.listen(process.env.PORT ? process.env.PORT : 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
