
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

function start(){
	options_box = document.getElementById('options_box');
	command_box = document.getElementById('command_box');
	$G.init(loop, 'canvas').gfx.canvas.init();

	socket = io();

	socket.on('message', function(data) {
		switch (data.type) {
			case 'state':
			{
				player_state = data;
				if (data.response) {
					options_box.innerText = data.response;
				}
			}
			break;
		}

		console.log(data);
	});

	command_box.addEventListener('keypress', function(e) {
		if (e.keyCode == 13 && player_state) {
			player_state.command = command_box.value.trim();
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
