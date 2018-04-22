
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
	'lft': 'wall_door_left.png',
	'rht': 'wall_door_right.png',
	'fwd': 'wall_door_front.png'
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
		var aspect = gfx.aspect();
		var inv_aspect = 1 / aspect;
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

		ctx.fillStyle   = '#0F0';
		ctx.textAlign = 'center';
		ctx.strokeStyle = 'black';

		ctx.save();
		ctx.transVec([15 * inv_aspect, 4 + Math.cos(time * 2)]);
		player_hand_sprite.draw(assets.images['Player_sheet.png'], 1, 0, 0);
		ctx.restore();

		dir_labels = {
			'lft': { text:'LFT', pos: [8, 12] },
			'fwd': { text:'FWD', pos: [30, 5] },
			'rht': { text:'RHT', pos: [50, 12] },
			'bck': { text:'BCK', pos: [30, 50] },
		};

		for (var dir in dir_table) {
			label = dir_labels[dir];
			if (dir_labels[dir]) {
				ctx.save();
				ctx.transVec(label.pos);
				ctx.fillText(label.text, 1, aspect);
				ctx.restore();
			}
		}

	}
}

function dir_from_heading(heading) {
	var reltative = [];
	switch (heading) {
		case 'north':
			return {'west': 'lft', 'east':'rht', 'north':'fwd', 'south': 'bck'};
		case 'south':
			return {'east': 'lft', 'west':'rht', 'south':'fwd', 'north': 'bck'};
		case 'west':
			return {'south': 'lft',  'north':'rht', 'west':'fwd', 'east': 'bck'};
		case 'east':
			return {'north': 'lft',  'south':'rht', 'east':'fwd', 'west': 'bck'};
	}
}

function start(){
	command_box = document.getElementById('command_box');
	$G.init(loop, 'canvas').gfx.canvas.init();

	$G.gfx.context.font = '8px Arial';
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
