
var lastTouchPos;

var ctx;
var paused = true;
var time = 0;
var socket = null;
var options_box = null;
var command_box = null;
var player_state = null;

var player_hand_sprite = null;
var level_sprite = null;

var dir_table = {};

var img_for_dir = {
	'left': 'wall_door_left.png',
	'right': 'wall_door_right.png',
	'forward': 'wall_door_front.png'
};

var sprite_files = [
	'wall_door_front.png',
	'wall_door_left.png',
	'wall_door_right.png',
	'Level.png',
	'Player_sheet.png'
];

$G.assets.images("imgs/").load(sprite_files, function(){
	start();
});


function loop(){
	var dt = $G.timer.tick();
	time += dt;

	with($G) {
		var ctx = gfx.context;
		var inv_aspect = 1 / gfx.aspect();
		gfx.canvas.clear('#333');

		ctx.save();
		ctx.transVec([0, gfx.aspect() * 30 - 30]);
		level_sprite.draw(assets.images['Level.png'], inv_aspect, 0, 0);

		for (var dir in dir_table) {
			var img = img_for_dir[dir];
			if (img) {
				level_sprite.draw(assets.images[img], inv_aspect, 0, 0);
			}
		}

		ctx.restore();

		ctx.save();
		ctx.transVec([15 * inv_aspect, 3]);
		player_hand_sprite.draw(assets.images['Player_sheet.png'], 1, 0, 0);
		ctx.restore();
	}
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

	$G.gfx.context.transVec = function(v){
		this.translate(v[0], v[1]);
	};

	player_hand_sprite = new $G.animation.sprite(0, 0, 57, 57, 6, 5);
	level_sprite = new $G.animation.sprite(0, 0, 60, 60, 1, 1);

	socket = io();

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

					dir_table = {};

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
