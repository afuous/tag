var http = require("http");
var io = require("socket.io");
var fs = require("fs");
var url = require("url");

var server = http.createServer(function(req, res) {
	var path = url.parse(req.url).pathname;
	if(path == "/") res.end(fs.readFileSync("index.html"));
	else if(path == "/script.js") res.end(fs.readFileSync("script.js"));
	else if(path == "/socketio.js") res.end(fs.readFileSync("socketio.js"));
	else res.end("404");
});

server.listen(8080);

var game = {
	width: 800,
	height: 600,
	accel: 0.05,
	decel: 0.15,
	radius: 20,
	bounce: 0.1,
	maxSpeed: 10,
	timeout: 500
}

var LEFT = -1;
var DOWN = -1;
var CENTER = 0;
var RIGHT = 1;
var UP = 1;

var players = [];
var it = null;
var itTime = 0;
var wait = 0;

function assignIt() {
	if(players.length < 2) it = null;
	else if(!~players.indexOf(it)) {
		it = players[Math.floor(Math.random() * players.length)];
		itTime = 0;
	}
}

function update() {
	for(var player of players) {
		player.socket.emit("update", {
			players: players.map(p => ({
				x: p.x,
				y: p.y,
				color: p == it ? "black" : p == player ? "blue" : "green"
			})),
			it: it ? {
				name: it.name,
				time: itTime
			} : null
		});
	}
}

function dist(a, b) {
	return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function randomColor() {
	var chars = "0123456789ABCDEF".split("");
	var color = "#";
	for(var i = 0; i < 6; i++) {
		color += chars[Math.floor(Math.random() * 16)];
	}
	return color;
}

io.listen(server).on("connection", function(socket) {
	socket.on("join", function(name) {
		players.push({
			socket: socket,
			x: game.radius + Math.random() * (game.width - 2 * game.radius),
			y: game.radius + Math.random() * (game.height - 2 * game.radius),
			dx: 0,
			dy: 0,
			xDir: 0,
			yDir: 0,
			color: randomColor(),
			activity: game.timeout,
			name: name
		});
		update();
	});
	
	socket.on("disconnect", function() {
		for(var i = 0; i < players.length; i++) {
			if(socket == players[i].socket) {
				players.splice(i, 1);
				break;
			}
		}
	});
	
	var keys = {
		left: ["xDir", LEFT],
		right: ["xDir", RIGHT],
		centerX: ["xDir", CENTER],
		up: ["yDir", UP],
		down: ["yDir", DOWN],
		centerY: ["yDir", CENTER]
	};
	for(var _key in keys) (function() {
		var key = _key;
		socket.on(key, function() {
			var player = players.find(player => socket == player.socket);
			if(player) {
				player[keys[key][0]] = keys[key][1];
				player.activity = game.timeout;
			}
		});
	})();
});

setInterval(function() {
	assignIt();
	if(wait) wait--;
	itTime++;
	for(var i = 0; i < players.length; i++) {
		var player = players[i];
		player.activity--;
		if(!player.activity) {
			player.socket.emit("timeout");
			players.splice(i--, 1);
			assignIt();
			continue;
		}
		if(player.xDir == LEFT) player.dx -= player.dx < 0 ? game.accel : game.decel;
		if(player.xDir == RIGHT) player.dx += player.dx > 0 ? game.accel : game.decel;
		if(player.yDir == UP) player.dy -= player.dy < 0 ? game.accel : game.decel;
		if(player.yDir == DOWN) player.dy += player.dy > 0 ? game.accel : game.decel;
		if(player.dx > game.maxSpeed) player.dx = game.maxSpeed;
		if(player.dx < -game.maxSpeed) player.dx = -game.maxSpeed;
		if(player.dy > game.maxSpeed) player.dy = game.maxSpeed;
		if(player.dy < -game.maxSpeed) player.dy = -game.maxSpeed;
		player.x += player.dx;
		player.y += player.dy;
		if(player.x < game.radius) {
			player.x = game.radius;
			player.dx *= -game.bounce;
		}
		if(player.x > game.width - game.radius) {
			player.x = game.width - game.radius;
			player.dx *= -game.bounce;
		}
		if(player.y < game.radius) {
			player.y = game.radius;
			player.dy *= -game.bounce;
		}
		if(player.y > game.height - game.radius) {
			player.y = game.height - game.radius;
			player.dy *= -game.bounce;
		}
		if(!wait && it && player != it && dist(player, it) <= 2 * game.radius) {
			wait = 200;
			it = player;
			itTime = 0;
		}
	}
	update();
}, 10);