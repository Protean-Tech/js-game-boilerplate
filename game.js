var ws = require('ws');
var fs = require('fs');

Array.prototype.pick = function() {
	return this[Math.floor(Math.random() * this.length)];
}

const directions = [ 'north', 'south', 'east', 'west'];

function level(path) {
	desc = fs.readFileSync(path, 'utf8');
	map = [];
	room_coords = [];
	cols = desc.split(desc, '\n');

	for (var ci = 0; ci < cols.length; ++ci) {
		var col = cols[ci];
		var rooms = []
		for (var i = 0; i < col.length; ++i) {
			if (col[i] == ' ') {
				rooms.push(false);
			}
			else {
				room_coords.push([ci, i]);
				rooms.push(true);
			}
		}

		map.push(rooms);
	}

	return map;
}

function Server(port) {
	var level = ;
	var players = {};

	var wss = new ws.Server({ port: 8080 });

	wss.on('connection', function connection(ws) {
		// get an unused random id
		do {
			ws.game_id = Math.floor(math.random() * 4096);
		} while (players[ws.game_id] == undefined);

		ws.coord = null;
		ws.health = 0;
		ws.name = null;
		ws.kills = 0;
		ws.deaths = 0;
		ws.direction = directions.pick();

		ws.spawn = function() {
			ws.coord = level.room_coords.pick();
			ws.health = 1;
		}

		ws.on('message', function incoming(message) {
		});

		players[ws.game_id] = ws;
	});

	wss.on('close', function close(ws) {
		delete players[ws.game_id];
	});
}
