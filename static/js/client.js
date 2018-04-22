
var lastTouchPos;

var ctx;
var paused = true;
var time = 0;
var socket = null;
var options_box = null;
var command_box = null;
var player_state = null;

var player_hand_sprite = null;
var player_shoot = false;
var level_sprite = null;
var enemy_sprite = null;

var dir_table = {};

var enemy_sprites = {};

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
	'Player_sheet.png',
	'BadGuy_fade.png'
];

$G.assets.images("imgs/").load(sprite_files, function(){
	start();
});

function Player(state) {
	var t = this;

	t.sprite = new $G.animation.sprite(0, 0, 50, 67, 8, 5);
	t.state = state;

	t.sprite.loop = false;

	t.draw = function() {
		with($G) {
			var x = t.state.id / 500;
			var ctx = gfx.context;
			var aspect = gfx.aspect();
			var inv_aspect = 1 / aspect;

			if (t.sprite.atEnd()) return;

			ctx.font = '10px Arial';
			ctx.fillStyle   = '#0F0';
			ctx.strokeStyle = '#000';
			ctx.save();
			ctx.transVec([49 + x, 24]);
			ctx.strokeText(t.state.name, 1, 1);
			ctx.fillText(t.state.name, 1, 1);
			ctx.restore();

			ctx.save();
			ctx.transVec([28 + x, 24]);
			t.sprite.draw(assets.images['BadGuy_fade.png'], inv_aspect, t.state.health > 0 ? 0 : 0.05, 0);
			ctx.restore();
		}
	};
}

function get_enemy_sprite(enemy) {
	if (!enemy_sprites[enemy.id]) {
		enemy_sprites[enemy.id] = new Player(enemy);
	}

	var player = enemy_sprites[enemy.id];
	player.state = enemy;

	if (player.state.health > 0) {
		player.sprite.time = 0;
	}

	return player;
}

function loop(){
	var dt = $G.timer.tick();
	time += dt;

	with($G) {
		var ctx = gfx.context;
		var aspect = gfx.aspect();
		var inv_aspect = 1 / aspect;
		gfx.canvas.clear('#333');

		if (player_state && player_state.health > 0)
		{
			// draw the level
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

			// enemy players
			ctx.fillStyle = '#0F0';
			for (var i = player_state.room_live_occupants.length; i--;) {
				var enemy = player_state.room_live_occupants[i];
				get_enemy_sprite(enemy).draw();
			}

			for (var i = player_state.room_dead_occupants.length; i--;) {
				var enemy = player_state.room_dead_occupants[i];
				if(get_enemy_sprite(enemy).draw()) {
					player_state.room_dead_occupants.unshift()
				}
			}

			// player hand
			ctx.save();
			ctx.transVec([30 * inv_aspect, 12 + Math.cos(time * 2)]);
			var finished = player_hand_sprite.draw(assets.images['Player_sheet.png'], 0.75, player_shoot ? 0.05 : 0, 0);

			if (finished) {
				player_shoot = false;
			}

			ctx.restore();

			dir_labels = {
				'lft': { text:'LFT', pos: [16, 24] },
				'fwd': { text:'FWD', pos: [60, 10] },
				'rht': { text:'RHT', pos: [100, 24] },
				'bck': { text:'BCK', pos: [60, 100] },
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

	$G.gfx.context.textAlign = 'center';
	$G.gfx.context.strokeStyle = 'black';

	player_hand_sprite = new $G.animation.sprite(0, 0, 146, 146, 6, 5);
	level_sprite = new $G.animation.sprite(0, 0, 120, 120, 1, 1);
	enemy_sprite =

	socket = io();

	socket.on('message', function(data) {
		switch (data.type) {
			case 'state':
			{
				player_state = data;
				if (data.response) {
					command_box.placeholder = data.response;
				}

				if (player_state.health > 0) {
					command_box.placeholder = '';
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
			case 'damaged':
			{
				player_shoot = true;
			}
			break;
			case 'died':
			{
				command_box.placeholder = 'Ready? Type "respawn"!';
			}
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
}
