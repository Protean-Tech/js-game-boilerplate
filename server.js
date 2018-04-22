var fs = require('fs');

Array.prototype.pick = function() {
	return this[Math.floor(Math.random() * this.length)];
}

Array.prototype.sameAs = function(arr) {
	if (this.length != arr.length) return false;
	for(var i = this.length; i--;) {
		if (this[i] != arr[i]) return false;
	}

	return true;
}

String.prototype.isAlpha = function () {
	let alpha = 'abcdefghijklmnopqrstuvwxyz';

	for(var i = this.length; i--;) {
		if (alpha.indexOf(this[i]) < 0) {
			return false;
		}
	}

	return true;
};

var directions = ['north', 'south', 'east', 'west'];
var direction_vecs = [[-1,0],[1,0], [0,1], [0,-1]];

function Level(path) {
	desc = fs.readFileSync(path, 'utf-8');
	map = [];
	room_coords = [];
	cols = desc.split('\n');

	for (var ci = 0; ci < cols.length; ++ci) {
		var col = cols[ci];
		var rooms = []
		for (var i = 0; i < col.length; ++i) {
			if (col[i] == ' ') {
				rooms.push(null);
			}
			else {
				rooms.push(room_coords.length);
				room_coords.push([ci, i]);
			}
		}

		map.push(rooms);
	}

	map.possible_moves = function(coord) {
		if (!coord || coord.length != 2) {
			return [];
		}

		var r = coord[0], c = coord[1];
		var possible_moves = [];

		directions.forEach(function(dir, i) {
			let vec = direction_vecs[i];
			if (map[r + vec[0]] != undefined)
			if (map[r + vec[0]][c + vec[1]] != null) {
				possible_moves.push(dir);
			}
		});

		return possible_moves;
	}

	map.room_coords = room_coords;

	return map;
}

function Event(type, message) {
	this.type = type;
	this.message = message;
}

module.exports.Server = function(http, port, path) {

	var io = require('socket.io')(http);
	var level = Level(path);
	var players = {};

	console.log('server started');

	function room_live_occupants(coord, exclude_id) {
		var occupants = [];
		for (var id in players) {
			if (id == exclude_id) continue;
			if (players[id].state.health <= 0) continue;
			if (!players[id].state.coord.sameAs(coord)) continue;
			occupants.push(players[id].shallow_state());
		}

		return occupants;
	}

	function room_dead_occupants(coord, exclude_id) {
		var occupants = [];
		for (var id in players) {
			if (id == exclude_id) continue;
			if (players[id].state.health > 0) continue;
			if (!players[id].state.coord.sameAs(coord)) continue;
			occupants.push(players[id].shallow_state());
		}

		return occupants;
	}

	function refresh_whole_room(coord) {
		for (var id in players) {
			console.log(id);
			players[id].refresh_room();
		}
	}

	function broadcast(event) {
		if (event instanceof Event) {
			console.log('[' + event.type + '] ' + event.message);
			for (var id in players) {
				players[id].send(event);
			}
		}
	}

	function broadcast_scoreboard() {
		player_list = []
		for (var id in players) {
			player_list.push(players[id].shallow_state());
		}

		player_list.sort(function(a, b) {
			return (b.kills - b.deaths) - (a.kills - a.deaths);
		});

		broadcast(new Event('scoreboard', player_list));
	}

	function restart() {
		for (var id in players) {
			players[id].reset();
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
			coord: [-1, -1],
			health: 0,
			name: null,
			kills: 0,
			deaths: 0,
			direction: null,
			possible_moves: [],
			room_state: 0,
			room_live_occupants: [],
			room_dead_occupants: [],
			response: "Enter your name to join."
		};

		player.reset = function() {
			this.kills = this.deaths = 0;
			this.spawn();
		}

		player.shallow_state = function() {
			return {
				type: 'state',
				id: player.player_id,
				coord: player.state.coord,
				health: player.state.health,
				name: player.state.name,
				kills: player.state.kills,
				deaths: player.state.deaths,
				direction: player.state.direction
			};
		}

		player.spawn = function() {
			var coord = level.room_coords.pick();

			for (var i = 3; room_live_occupants(coord).length && i--;) {
				coord = level.room_coords.pick();
			}

			player.state.coord = coord;
			console.log(player.state.coord);
			player.state.direction = directions.pick();
			player.state.health = 3;

			refresh_whole_room(player.state.coord);
			player.send(new Event('respawned'));
		}

		player.damage = function(amount, killer) {
			var old_health = player.state.health;
			player.state.health -= amount;

			if (player.state.health <= 0 && old_health > 0) {
				// player died
				player.state.deaths += 1;

				refresh_whole_room(player.state.coord);

				player.send(new Event('died', killer));

				return true;
			}

			return false;
		}

		player.refresh_room = function() {
			var coord = player.state.coord;
			player.state.room_live_occupants = room_live_occupants(player.state.coord, player.player_id);
			player.state.room_dead_occupants = room_dead_occupants(player.state.coord, player.player_id);
			player.state.possible_moves = level.possible_moves(coord);

			if (!coord.sameAs([-1, -1])) {
				player.state.room_state = level[coord[0]][coord[1]];
			}

			player.send(player.state);
		}

		player.on('message', function incoming(message) {
			player.state.response = "";
			console.log(message)

			if (player.state.name == null && typeof(message.command) === 'string') {
				// Player has set their name, get read to spawn them
				var proposed_name = message.command.toLowerCase();
				console.log(proposed_name);
				if (proposed_name.isAlpha()){

					if (proposed_name.length != 7) {
						player.state.response = "Please enter a 7 character long name!";
					}
					else{
						player.state.name = proposed_name;
						player.spawn();
						broadcast(new Event('joined', player.state.name + ' has joined the game'));
						broadcast_scoreboard();
					}
				}
				else {
					player.state.response = "Please enter a different name, letters only";
				}
			}
			else if (typeof(message.command) === 'string') {
				// accept commands here
				var cmd = message.command.trim().toLowerCase();
				switch (cmd) {
					case 'respawn':
						if (player.state.health <= 0){
							player.spawn();
						}
						break;
					case 'north':
					case 'south':
					case 'west':
					case 'east':
					{ // Player has moved
						// console.log('moving');
						var move = cmd;

						var move_idx = directions.indexOf(move);
						// console.log(move_idx);
						if (move_idx > -1 && move == player.state.direction) {
							player.state.coord[0] += direction_vecs[move_idx][0];
							player.state.coord[1] += direction_vecs[move_idx][1];
							player.state.direction = move;
						}
						else {
							player.state.direction = move;
						}
					}
						break;
					default:
						console.log('shooting');
						// check to see if they typed any character names
						room_live_occupants(player.state.coord).forEach(function(occupant) {
							console.log(occupant);
							if (cmd == occupant.name) {
								player.send(new Event('damaged', occupant.id));
								if (players[occupant.id].damage(1, player.state)) {
									player.state.kills += 1;

									broadcast(new Event('killed', player.state.name + ' killed ' + occupant.name));
									broadcast_scoreboard();

									if (player.state.kills >= 1) {
										broadcast(new Event('winner', player.shallow_state()));

										setTimeout(function() {
											restart();
										}, 10000);
									}

									player.refresh_room();
								}
							}
						});

				}
			}

			console.log(player.state);
			refresh_whole_room(player.state.coord);
		});

		player.on('disconnect', function() {
			console.log('disconnect');
			broadcast(new Event('quit', player.state.name + ' has quit the game'));

			var coord = player.state.coord;
			delete players[player.player_id];

			broadcast_scoreboard();
			refresh_whole_room(coord);
		});

		players[player.player_id] = player;

		player.send(player.state);
	});
}
