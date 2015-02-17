"use strict";

let http = require("http");
let io = require("socket.io");
let fs = require("fs");
let url = require("url");

let server = http.createServer(function(req, res) {
	let path = url.parse(req.url).pathname;
	if(path == "/") res.end(fs.readFileSync("index.html"));
	else if(path == "/script.js") res.end(fs.readFileSync("script.js"));
	else if(path == "/socketio.js") res.end(fs.readFileSync("socketio.js"));
	else res.end("404");
});
server.listen(8080);

const game = {
	width: 800,
	height: 600,
	accel: 0.05,
	decel: 0.15,
	radius: 20,
	bounce: 0.1,
	maxSpeed: 10,
	timeout: 500,
	safeTime: 200,
	tagWait: 100
}

const LEFT = -1;
const DOWN = -1;
const CENTER = 0;
const RIGHT = 1;
const UP = 1;

let players = [];
let it = null;
let itTime = 0;
let tagWait = 0;

function assignIt() {
	if(players.length < 2) it = null;
	else if(!~players.indexOf(it)) {
		it = players[Math.floor(Math.random() * players.length)];
		itTime = 0;
		tagWait = game.tagWait;
	}
}

function update() {
	for(let player of players) {
		player.socket.emit("update", {
			players: players.map(p => ({
				x: p.x,
				y: p.y,
				color: p == it ? "black" : p == player ? "blue" : "green"
			})),
			it: it ? {
				name: it.name,
				time: Math.floor(itTime / 100)
			} : null
		});
	}
}

function dist(a, b) {
	return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

io.listen(server).on("connection", function(socket) {
	socket.on("join", function(name) {
		if(name.length == 0 || players.some(player => socket == player.socket)) return;
		name = name.substring(0, 25);
		if(players.some(player => name == player.name)) {
			socket.emit("start", false);
		}
		else {
			players.push({
				socket: socket,
				x: game.radius + Math.random() * (game.width - 2 * game.radius),
				y: game.radius + Math.random() * (game.height - 2 * game.radius),
				dx: 0,
				dy: 0,
				xDir: 0,
				yDir: 0,
				activity: game.timeout,
				name: name,
				safe: game.safeTime
			});
			socket.emit("start", true);
			update();
		}
	});
	
	socket.on("disconnect", function() {
		players = players.filter(player => socket != player.socket);
	});
	
	let keys = {
		left: ["xDir", LEFT],
		right: ["xDir", RIGHT],
		centerX: ["xDir", CENTER],
		up: ["yDir", UP],
		down: ["yDir", DOWN],
		centerY: ["yDir", CENTER]
	};
	for(let key in keys) {
		socket.on(key, function() {
			let player = players.find(player => socket == player.socket);
			if(player) {
				player[keys[key][0]] = keys[key][1];
				player.activity = game.timeout;
			}
		});
	};
});

setInterval(function() {
	assignIt();
	if(tagWait) tagWait--;
	itTime++;
	for(let i = 0; i < players.length; i++) {
		let player = players[i];
		player.activity--;
		if(!player.activity) {
			player.socket.emit("timeout");
			players.splice(i--, 1);
			assignIt();
			continue;
		}
		if(player.safe) player.safe--;
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
		if(!tagWait && it && player != it && !player.safe && dist(player, it) <= 2 * game.radius) {
			tagWait = game.tagWait;
			it = player;
			itTime = 0;
		}
	}
	update();
}, 10);