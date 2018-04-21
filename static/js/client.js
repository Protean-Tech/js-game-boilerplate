
var lastTouchPos;

var ctx;
var paused = true;
var time = 0;
var socket = null;
var options_box = null;
var command_box = null;
var player_state = null;

$G.assets.images("imgs/").load(['Player.png'], function(){
	start();
});

function aspectRatio(){
	return $G.canvas.height / $G.canvas.width;
}


function loop(){
	var dt = $G.timer.tick();
	time += dt;

}

function dir_from_heading(heading) {
	var reltative = [];
	switch (heading) {
		case 'north':
			return {'west': 'left', 'east':'right', 'north':'forward', 'south': 'back'};
		case 'south':
			return {'east': 'left', 'west':'right', 'south':'forward', 'north': 'back'};
		case 'west':
			return {'south': 'left',  'north':'right', 'west':'forward', 'east': 'back'};
		case 'east':
			return {'north': 'left',  'south':'right', 'east':'forward', 'west': 'back'};
	}
}

function start(){
	command_box = document.getElementById('command_box');
	$G.init(loop, 'canvas').gfx.canvas.init();

	socket = io();
	var dir_table = {};

	socket.on('message', function(data) {
		command_box.placeholder = '';

		switch (data.type) {
			case 'state':
			{
				player_state = data;
				if (data.response) {
					command_box.placeholder = data.response;
				}

				if (player_state.health > 0) {
					var rel_dirs = dir_from_heading(player_state.direction);

					player_state.possible_moves.forEach(function(move) {
						if (move in rel_dirs) {
							dir_table[rel_dirs[move]] = move;
						}
					})
				}
			}
			break;
		}

		console.log(data);
	});

	command_box.addEventListener('keypress', function(e) {
		if (e.keyCode == 13 && player_state) {
			var cmd = player_state.command = command_box.value.trim();

			if (cmd in dir_table) {
				cmd = player_state.command = dir_table[cmd]
			}

			command_box.value = '';

			socket.send(player_state);
		}
	});

	lastTouchPos = $V([$G.canvas.width / 2, $G.canvas.height / 2]);

	var move = function(e){
		var t = e.pageX ? e : e.touches[0];

		var x = $G.canvas.width * t.pageX / window.innerWidth;
		var y = $G.canvas.height * t.pageY / window.innerHeight;

		lastTouchPos = $V([x, y]);
	};

	var begin = function(e){

	};

	$G.input.touch.setStart(begin);
	$G.input.touch.setMove(move);
	$G.input.mouse.setClick(begin);
	$G.input.mouse.setMove(move);
}
