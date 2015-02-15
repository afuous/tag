(function() {
	var socket = io.connect();
	
	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");
	
	canvas.width = 800;
	canvas.height = 600;
	
	var radius = 20;
	
	var keys = {};
	window.onkeydown = function(event) {
		var key = (event || window.event).keyCode;
		keys[key] = true;
		if(key == 37) socket.emit(keys[39] ? "centerX" : "left");
		else if(key == 39) socket.emit(keys[37] ? "centerX" : "right");
		else if(key == 38) socket.emit(keys[40] ? "centerY" : "up");
		else if(key == 40) socket.emit(keys[38] ? "centerY" : "down");
	};
	window.onkeyup = function(event) {
		var key = (event || window.event).keyCode;
		keys[key] = false;
		if(key == 37) socket.emit(keys[39] ? "right" : "centerX");
		else if(key == 39) socket.emit(keys[37] ? "left" : "centerX");
		else if(key == 38) socket.emit(keys[40] ? "up" : "centerY");
		else if(key == 40) socket.emit(keys[38] ? "down" : "centerY");
	};
	
	document.getElementById("button").onclick = function() {
		socket.emit("join", document.getElementById("name").value);
		document.getElementById("join").style.display = "none";
		document.getElementById("game").style.display = "block";
	};
	
	socket.on("timeout", function() {
		document.getElementById("join").style.display = "block";
		document.getElementById("game").style.display = "none";
	});
	
	socket.on("update", function(game) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for(var i = 0; i < game.players.length; i++) {
			var player = game.players[i];
			ctx.fillStyle = player.color;
			ctx.beginPath();
			ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
			ctx.fill();
		}
		document.getElementById("it").innerHTML = game.it ? game.it.name + " has been it for " + (game.it.time / 100).toFixed(2) + " seconds" : "";
	});
})();