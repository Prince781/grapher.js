/***********************************************
 * grapher.js
 * A simple API for data visualization on the
 *  web.
 * PennApps - PF (February 2014)
************************************************/
"use strict";

var Grapher = new function() {
	var _this = this;
	
	// specific render functions:
	this.renderers = {
		xy: function(ct) {
			// ct - context
			/* draws xy axes for a scatter/box plot */
			this.drawAxes = function(pos, width, height) {
				// pos - {x: num, y: num}
				ct.beginPath();
				ct.moveTo(pos.x, pos.y-height);
				ct.lineTo(pos.x, pos.y);
				ct.lineTo(pos.x+width, pos.y);
				ct.stroke();
				ct.closePath();
			};
		}
	};
	
	/* renders a particular Graph (termed "GraphModel" here) */
	this.render = function(GraphModel, options) {
		if (!(GraphModel instanceof Graph))
			throw "Grapher: Cannot render something other than a Graph";
		
		try { // actually render
			GraphModel.render();
			GraphModel.rCallback();
		} catch (e) {
			try { GraphModel.eCallback(); } catch (e) {} // callback
			console.log("GraphModel error: "+e.message);
		}
	};
};

var Graph = function(canvas, type, dataModel, options) {
	// canvas - the canvas element to use
	// type - a preset type to use
	/**
	 * options: 
	 * rCallback: function
	 * eCallback: function
	 */
	// rCallback - (optional) called after rendering has completed
	// eCallback - (optional) potentially called after an error
	if (canvas.tagName != "CANVAS")
		throw "GraphModel: param \"canvas\" is not actually a <canvas> element.";

	var _gthis = this;
	
	// private:
	function getOption(key, def) {
		// def - default value (if key is unavailable)
		var ops = typeof options == "undefined" ? {} : options;
		return (key in ops) ? ops[key] : def;
	}
	var ctx = canvas.getContext("2d");
	// format: r_<type> denotes a renderer of type "<type>"
	var r_xy = new Grapher.renderers.xy(ctx); // create a new xy renderer
	
	// default render functions:
	function fRenderer() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	
	this.type = type;
	this.idata = []; // contains independent variables/labels
	this.ddata = []; // contains dependent variables/labels
	
	this.rCallback = getOption("rCallback", function(){}); // on successful render
	this.eCallback = getOption("eCallback", function(){}); // on error
	
	// dataModel varies between types
	switch (type) {
		case "scatter":
			_gthis.render = function() {
				fRenderer(); // do this first
				//ctx.strokeStyle = "rgba(0,0,0,1)";
				
				
				ctx.lineWidth = getOption("axesWidth", 2);
				ctx.strokeStyle = getOption("axesColor", "rgba(124,124,124,0.95)");
				r_xy.drawAxes({x:60.5,y:canvas.height-60.5}, canvas.width-100, canvas.height-100);
			};
			break;
		default:
			console.log("Chart type not supported.");
			break;
		// TODO: other data models
	}	
};
