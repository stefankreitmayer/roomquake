// Enhance Date with a bunch of utility functions

// Retuns the date in input form
Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});


// Returns date as yyyy-mm-dd
Date.prototype.yyyymmdd = function() {                     
        var yyyy = this.getFullYear().toString();                                    
        var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
        var dd  = this.getDate().toString();                
        return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}; 
	  
// Returns time in hh:mm:ss	
Date.prototype.hhmmss = function() {
		var h = this.getHours().toString();
    var m = this.getMinutes().toString();
    var s = this.getSeconds().toString();
		return (h[1]?h:"0"+h[0]) + ':' + (m[1]?m:"0"+m[0]) + ':' + (s[1]?s:"0"+s[0]);
};

// Returns true if two dates are on the same day
Date.prototype.sameDayOf = function(d) {
	var d1 = new Date(this).setHours(0, 0, 0, 0);
	var d2 = new Date(d).setHours(0, 0, 0, 0);
	return  d1 === d2;
};



// Global variables 

var MIN_MAG = 2;
var MAX_MAG = 5;

// Model 
// NOTE: all dimensions are specified in meters!
var room_width;
var room_height;
var seismographs;
var quakes;
var countdown_interval_id;

// Canvases/processing references
var live_canvas = document.getElementById("live_canvas");
var live_p = new Processing(live_canvas, ScheduledQuakesMap);

// Initialize nutella
var query_params = nutella.init(location.search, function() {
	// Send mode update
	nutella.publish( 'mode_update', {rq_mode : 'schedule'} )
	//Fetch room configuration
	nutella.request("room_configuration", function(response) {
		// Update model
		room_height = response.room_height_meters;
		room_width = response.room_width_meters;
		seismographs = response.seismographs;
		// TODO If there's no data, it's a problem, we shouldn't be here... 
		updateCanvasSize();
	});
	quakes = new Array();
	//Fetch quakes
	nutella.request("quakes_schedule", function(response) {
		// Update model
		quakes = response.quakes_schedule;
		// If there's no data, display the quakes schedule modal
		if (quakes===undefined)
			$('#quakes_schedule_modal').foundation("reveal", "open");
		// Update the quakes table view
		updateQuakesTableView('quakes_schedule', false);
	});
});

// Update links to reflect nutella parameters
$('a').each(function (index) {
	var link = $(this).attr('href');
	if (link!="" && link!="#")
	$(this).attr('href', link + "?run_id=" + query_params.run_id + "&broker=" + query_params.broker);
});


// Attach event handlers to GUI components

// Configure date pickers in quakes generation modal
$("#unit_start_date").prop("min", new Date().toDateInputValue());
$("#unit_start_date").val(new Date().toDateInputValue());
$("#unit_end_date").prop("min", new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toDateInputValue());
$("#unit_start_date").change(function() {
	$("#unit_end_date").prop("min", $("#unit_start_date").val());
});

// Click 'generate' on quakes generation modal
$("#quakes_schedule_form").on('valid.fndtn.abide submit', function(e) {
	if(e.type === "valid") {
		var start = parseD($("#unit_start_date").val());
		var end = parseD($("#unit_end_date").val());
		var quakes_n = parseInt($("#total_quakes_input").val());
		quakes = suggestQuakesSchedule(start, end, MIN_MAG, MAX_MAG, quakes_n);
		updateQuakesTableView('quakes_schedule', false);
		$("#quakes_schedule_modal").foundation("reveal", "close");
		nutella.publish('quakes_schedule_update', { quakes_schedule : quakes } );
	}
	return false;
});

// Click on quakes table row to show coordinates for that quake in the map
$('#demo_quakes_table').on('click', 'tbody tr', function() {
	var r_id = $(this).attr('r_id');
	if (demo_p.highlight===undefined)
		demo_p.highlight = r_id;
	else
		demo_p.highlight = undefined;
});


// Cancel countdown whenever we dismiss the modal
// It could be dismissed by clicking cancel, tapping outside of the modal or by waiting for countdown completion
$(document).on('close.fndtn.reveal', '#countdown', function (e) {
	// ignore non-namespaced event (i.e. work-around for bug in Foundation framework https://github.com/zurb/foundation/issues/5482)
	if (e.namespace != 'fndtn.reveal') return false;
	clearInterval(countdown_interval_id);
	countdown_interval_id = undefined;
});


// Utility functions

// Updates views whenever a change in the model is made
function updateCanvasSize() {
	live_canvas.setAttribute("height", live_canvas.width * room_height / room_width)
	live_p.size(live_canvas.width, live_canvas.height);
}

// Updates the quakes table
// if demo_flag is set to true, only demo quakes are visualized
function updateQuakesTableView(table_name, demo_flag) {
	$("#"+table_name+" tbody").empty();
	quakes.filter(function(el) {
		return el.demo==demo_flag;
	}).forEach(function(el, i) {
		var date = new Date(el.time);
		var date_options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
		var time_options = {hour: "numeric", minute: "numeric", second: "numeric"};
		var s_date = date.toLocaleString("en-US", date_options);
		var s_time = date.toLocaleString("en-US", time_options);
		if (date > new Date()) {
			$("#"+table_name+" tbody").append('<tr r_id="'+i+'"><td>'+(i+1)+'</td><td class="date_cell">'+s_date+'</td><td class="time_cell">'+s_time+'</td><td class="magnitude_cell">'+el.magnitude+'</td></tr>');
		} else {
			$("#"+table_name+" tbody").append('<tr r_id="'+i+'" class="uneditable"><td>'+(i+1)+'</td><td class="date_cell">'+s_date+'</td><td class="time_cell">'+s_time+'</td><td class="magnitude_cell">'+el.magnitude+'</td></tr>');
		}
	});
}



// Utility functions

// Perturbates a value with a random percentage
function perturbate(v, percent) {
	return  -v*percent/2 + Math.random()*percent*v;
}

// Shuffle and array (Fisher-Yates algorithm)
function shuffle(array) {
  var m = array.length, t, i;
  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);
    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

// Parses a date from data input box
function parseD(str) {
    var y = str.substr(0,4),
        m = str.substr(5,2) - 1,
        d = str.substr(8,2);
    var D = new Date(y,m,d);
    return (D.getFullYear() == y && D.getMonth() == m && D.getDate() == d) ? D : 'invalid date';
};

// Parses a time from time input box
function parseT(str, date) {
	var hms = str.split(":");
	var s2 = hms[2].split(" ");
	hms[2] = s2[0];
	var ampm = s2[1];
	var time = {};
	if (ampm=="PM") {
		time.hour = hms[0]+12;
	} else {
		time.hour = hms[0];
	}
	time.min = hms[1];
	time.sec = hms[2];
	if (date === undefined) {
		return time;
	} else {
		date.setHours(time.hour);
		date.setMinutes(time.min);
		date.setSeconds(time.sec);
		return date;
	}
}

// Generates a series of quakes
// first, date of the first quake
// last, date of the last quake
// magMin, minimum magnitude
// magMax, maxiumum magnitude
// tot_quakes, total number of quakes
function suggestQuakesSchedule(first, last, magMin, magMax, tot_quakes) {
	// how often will we generate a quake?
	var interval = (last - first) / (tot_quakes+2);
	// how many quakes have magnitude x?
	var totMag = 0; 
	var cm = 1;
	for (i=0; i<(magMax-magMin+1); i++) {
		totMag += cm;
		cm *=2;
	}
	var magProps = new Array();
	cm = 1
	for (i=0; i<(magMax-magMin+1); i++) {
		magProps.push(cm/totMag);
		cm *=2;
	}
	magProps.reverse();
	magProps.forEach(function(el, i, a){
		a[i] = Math.round(el * tot_quakes);
	});
	// generate quakes
	var suggested_quakes = new Array();
	var quakes_time = new Array();
	magProps.forEach(function(el, index, a) {
		for (i=0; i<el; i++) {
			quakes_time.push(new Date( first.getTime() + interval * (quakes_time.length+1) + perturbate(interval, .1)));
		}
	});
	quakes_time = shuffle(quakes_time);
	magProps.forEach(function(el, index, a) {
		for (i=0; i<el; i++) {
			var q = {};
			q.magnitude = magMin+index;
			q.time = quakes_time[suggested_quakes.length];
			var xy = Math.random() * room_height;
			q.location = {};
			q.location.x = xy;
			q.location.y = xy;
			q.demo = false;
			suggested_quakes.push(q);
		}
	});
	suggested_quakes.sort(function(a, b){
		return a.time - b.time;
	});
	return suggested_quakes;
}
