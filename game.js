var fs = require('fs');

Array.prototype.pick = function() {
	return this[Math.floor(Math.random() * this.length)];
}

String.prototype.isAlpha = function () {
	let alpha = 'abcdefghijklmnopqrstuvwxyz';

	for(var i = this.length; i--;) {
		if (alpha.indexOf(this[i]) < 0) {
			return false;
		}
	}
};

var directions = [ 'north', 'south', 'east', 'west'];
var direction_vecs = [[-1,0],[1,0], [0,1], [0,-1]];

function Level(path) {
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

	map.possible_moves = function(coord) {
		if (coord.length != 2) {
			return [];
		}

		var r = coord[0], c = coord[1];
		var possible_moves = [];

		directions.forEach(function(dir, i) {
			let vec = direction_vecs[i];
			if (map[r + vec[0]] != undefined)
			if (map[r + vec[0]][c + vec[1]] == true) {
				possible_moves.push(dir);
			}
		});

		return possible_moves;
	}

	return map;
}

function Event(type, message) {
	return {
		type: type,
		message: message
	};
}

module.exports.Server = function(http, port, path) {

	var io = require('socket.io')(http);
	var level = Level(path);
	var players = {};

	console.log('server started');

	function room_live_occupants(coord) {
		var occupants = [];
		for (var id in players) {
			if (players[id].state.health > 0) continue;
			occupants.push(players[id].state);
		}

		return occupants;
	}

	function room_dead_occupants(coord) {
		var occupants = [];
		for (var id in players) {
			if (players[id].state.health <= 0) continue;
			occupants.push(players[id].state);
		}

		return occupants;
	}

	function refresh_whole_room(coord) {
		for (var id in players) {
			players[id].refresh_room();
		}
	}

	function broadcast(event) {
		if (event instanceof Event) {
			console.log('[' + event.type + '] ' + event.message);
			for (var id in players) {
				players[id].refresh_room();
			}
		}
	}

	io.on('connection', function connection(player) {
		// get an unused random id
		do {
			player.player_id = Math.floor(Math.random() * 4096);
		} while (players[player.player_id] != undefined);

		console.log(player.player_id + " connected");

		player.state = {
			type: 'state',
			coord: null,
			health: 0,
			name: null,
			kills: 0,
			deaths: 0,
			direction: null,
			possible_moves: [],
			room_live_occupants: [],
			room_dead_occupants: [],
			response: ""
		};

		player.spawn = function() {
			player.state.coord = level.room_coords.pick();
			player.state.direction = directions.pick();
			player.state.health = 1;

			refresh_whole_room(player.state.coord);
		}

		player.damage = function(amount) {
			var old_health = player.state.health;
			player.state.health -= amount;

			if (player.state.health <= 0 && old_health > 0) {
				// player died
				player.state.deaths += 1;

				refresh_whole_room(player.state.coord);

				return true;
			}

			return false;
		}

		player.refresh_room = function() {
			player.state.room_live_occupants = room_live_occupants(player.state.coord);
			player.state.room_dead_occupants = room_dead_occupants(player.state.coord);
			player.state.possible_moves = level.possible_moves(player.state.coord);

			player.send(player.state);
		}

		player.on('message', function incoming(message) {
			player.state.response = "";

			if (!player.state.name && typeof(message.name) === 'string') {
				// Player has set their name, get read to spawn them
				var proposed_name = message.name.toLowerCase();

				if (proposed_name.isAlpha()){
					player.state.name = message.name.toLowerCase();
					player.spawn();
					broadcast(new Event('joined', player.state.name + ' has joined the game'));
				}
				else {
					player.state.response = "Please enter a different name, letters only";
				}
			}
			else if (typeof(message.command) === 'string') {
				// accept commands here
				var cmd = message.command.toLowerCase();
				switch (cmd) {
					case 'north':
					case 'south':
					case 'west':
					case 'east':
					{ // Player has moved
						var move = directions[cmd];
						if (player.state.possible_moves.indexOf(move) > -1) {
							player.state.coord[0] += direction_vecs[0];
							player.state.coord[1] += direction_vecs[1];

							player.state.direction = move;
						}
					}
						break;
					default:
						// check to see if they typed any character names
						room_live_occupants(player.state.coord).forEach(function(occupant) {
							if (player.state.command === occupant.name) {
								if (occupant.damage(1)) {
									broadcast(new Event('killed', player.state.name + ' killed ' + occupant.name));
									player.state.kills += 1;
									player.refresh_room();
								}
							}
						});

				}
			}

		});

		players[player.player_id] = player;

		console.log(player.state);
		player.send(player.state);
	});

	io.on('close', function close(ws) {
		broadcast(new Event('quit', player.state.name + ' has quit the game'));
		delete players[ws.player_id];
	});
}
