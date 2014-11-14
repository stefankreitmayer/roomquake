function valid(v) {
	return v!=undefined && v!="" && v!=null;
}


function DemoQuakesMap(p) {	
	// Utility functions
	p.toCanvasX = function(r_x) {
		return r_x * p.externals.canvas.width / room_width;
	}
	p.toCanvasY = function(room_y) {
		return (room_height - room_y) * p.externals.canvas.height / room_height;
	}
	p.toRoomX = function(canvas_x) {
		return canvas_x * room_width / p.externals.canvas.width;
	}
	p.toRoomY = function(canvas_y) {
		return room_height - canvas_y * room_height / p.externals.canvas.height;
	}

	p.setup = function() {
		p.size(p.externals.canvas.width, p.externals.canvas.height);
		p.manualQuakeX = -100;
		p.manualQuakeY = -100;
	}
	
	p.draw = function() {
		p.background(255);
		p.drawSeismographs();
		p.drawMouseQuake();
		p.drawDemoQuakes();
	}
	
	// Draw functions
	
	p.drawSeismographs = function() {
		if (!valid(seismographs))
			return;
		// Shapes
		p.rectMode(p.CENTER);
		p.noFill();
		p.stroke(0);
		seismographs.forEach(function(e) {
			p.rect(p.toCanvasX(e.x), p.toCanvasY(e.y), 20, 20);
		});
		// Labels
		p.fill(0);
		p.textAlign(p.CENTER, p.CENTER);
		seismographs.forEach(function(e) {
			p.text('S'+e.id, p.toCanvasX(e.x), p.toCanvasY(e.y));
		});
	}
	
	p.drawMouseQuake = function() {
		if (p.manualQuakeX >=0) {
			// Draw dot
			p.fill(0);
			p.stroke(0);
			p.ellipse(p.manualQuakeX, p.manualQuakeY, 10, 10);
			// Draw coordinates
			p.textAlign(p.CENTER, p.CENTER);
			p.text('(' + Number((p.manualQuakeXroom).toFixed(2)) + ', ' + Number((p.manualQuakeYroom).toFixed(2)) + ')', p.manualQuakeX, p.manualQuakeY - 15);
		}
	}
	
	p.drawDemoQuakes = function() {
		if (!valid(quakes))
			return;
		p.stroke(255, 0, 0);
		p.noFill();
		quakes.filter(function(el) {
			return el.demo;
		}).forEach(function(el) {
			p.ellipse(p.toCanvasX(el.location.x), p.toCanvasY(el.location.y), 10, 10);
		});
	}
		
		
	// Event handlers
		
	p.mousePressed = function() {
		// Set location of mouse quake 
		p.manualQuakeX = p.mouseX;
		p.manualQuakeY = p.mouseY;
		p.manualQuakeXroom = p.toRoomX(p.mouseX);
		p.manualQuakeYroom = p.toRoomY(p.mouseY);
		// Update GUI
		$("#quake").removeClass("disabled");
		$("#cancel").removeClass("disabled");
		$("#demo_magnitude").attr("disabled", false)
	}
		
}