
var lastTouchPos;

var ctx;
var paused = true;
var time = 0;
var socket = null;

$G.assets.images("imgs/").load([], function(){
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
	$G.init(loop, 'canvas').gfx.canvas.init();

	socket = io();

	socket.on('message', function(data) {
		console.log(data);
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
