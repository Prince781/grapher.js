/***********************************************
 * grapher.js
 * A simple API for data visualization on the
 *  web.
 * PennApps - PF (February 2014)
************************************************/
"use strict";

var Grapher = new function() {
	var _this = this;
	
	// specific grapher functions:
	this.range = function(l, u, increment) {
		// we have l-u data points
		// l - lower bound
		// u - upper bound
		var incr = typeof increment == "undefined" || increment <= 0 ? 1 : increment;
		var arr = [];
		for (var i=l; i<=u; i+=incr)
			arr.push(l+i);
		
		arr.lower = l;
		arr.upper = u;
		arr.increment = incr;
		return arr;
	};
	
	// specific data-manipulation functions:
	this.data = {
		getRange: function(datasets) {
			var lower = datasets[0].x[0], upper = datasets[0].x[0], incr = 0;
			var num = 0;
			for (var i=0; i<datasets.length; i++) {
				if (datasets[i].x.length > 0) {
					incr += datasets[i].x[1] - datasets[i].x[0];
					num++; // increase count
				}
				for (var j=0, p=datasets[i].x[j]; j<datasets[i].x.length; j++, p=datasets[i].x[j])
					lower = p<lower?p:lower, upper = p>upper?p:upper;
			}
			incr /= (num==0 ? 1 : num);
			return _this.range(lower, upper, incr);
		}
	};
	
	// specific render functions:
	this.renderers = {
		xy: function(ct) {
			// ct - context
			
			/* draws a title at the top of the chart */
			this.drawTitle = function(text, pos, width) {
				// text - title text
				var ellipLen = ct.measureText("...").width;
				// cut off overflowing text
				if (ct.measureText(text).width > width) {
					while (ct.measureText(text).width+ellipLen > width 
							&& text.length > 0)
						text = text.substr(0,text.length-1);
					text += "...";
				}
				ct.textAlign = "center";
				ct.fillText(text, pos.x, pos.y);
			};
			
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
			
			/* draws x-labels underneath the graph */
			this.drawXLabels = function(xdata, pos, width) {
				// pos - {x: num, y: num}
				for (var i=0; i<xdata.length; i++)
					ct.fillText(xdata[i], pos.x+i*(width/(xdata.length-1)), pos.y);
			};
			
			/* draws y-axis range adjacent to the graph */
			this.drawYRange = function(ydata, pos, height) {
				// pos - {x: num, y: num}
				
			};
			
			this.drawDataset = function(dset, range, pos, width, height) {
				// dset - our data set {x: ,y: }
				// range - array of range data
				// pos - starting point to draw data
				// width, height - boundaries of data drawings
				for (var i=0; i<dset.x.length; i++) {
					var x = pos.x+(dset.x[i]/range.upper)*width,
						y = pos.y-(dset.y[i]/range.upper)*height;
					ct.beginPath();
					ct.arc(x, y, 5, 0, Math.PI*2, false);
					ct.stroke();
					ct.closePath();
				}
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
	function getDOption(dataset, key, def) {
		// def - default value (if key is unavailable)
		return (key in dataset) ? dataset[key] : def;
	}
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
	function optCoeff(num) {
		// optimized coefficient (numbers%2==1 need 0.5, else do not)
		return getOption("sharpLines", true) ? (num%2 ? 0.5 : 0) : 0;
	}
	
	// dimensions of the actual graph frame
	this.width = canvas.width-100;
	this.height = canvas.height-100;
	
	this.type = type;
	this.range = Grapher.data.getRange(dataModel.datasets);
	
	this.rCallback = getOption("rCallback", function(){}); // on successful render
	this.eCallback = getOption("eCallback", function(){}); // on error
	
	// dataModel varies between types
	switch (type) {
		case "scatter":
			_gthis.render = function() {
				fRenderer(); // do this first
				
				// fill background color
				ctx.fillStyle = getOption("bgColor", "rgba(0,0,0,0)");
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// draw axes
				ctx.lineWidth = getOption("axesWidth", 2);
				ctx.strokeStyle = getOption("axesColor", "rgba(124,124,124,0.95)");
				r_xy.drawAxes({
					x: 60 + optCoeff(ctx.lineWidth),
					y: canvas.height - 60 - optCoeff(ctx.lineWidth)
				}, _gthis.width, _gthis.height);
				
				// draw title
				ctx.fillStyle = getOption("titleColor", "rgba(34,34,34,0.9)");
				ctx.font = getOption("titleFont", "18px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawTitle("title" in dataModel ? dataModel.title : "Title", {
					x: optCoeff(ctx.lineWidth) + canvas.width/2,
					y: 30+optCoeff(ctx.lineWidth)
				}, _gthis.width+50);
				
				// add x-labels
				ctx.fillStyle = getOption("labelColor", "rgba(64,64,64,0.9)");
				ctx.font = getOption("labelFont", "12px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawXLabels(_gthis.range, {
					x: 60 + optCoeff(ctx.lineWidth),
					y: canvas.height - 40 - optCoeff(ctx.lineWidth)
				}, _gthis.width);
				
				// draw data points
				for (var i=0; i<dataModel.datasets.length; i++) {
					ctx.fillStyle = getDOption(dataModel.datasets[i],
										"fillStyle", "rgba(23,42,34,0.6)");
					ctx.strokeStyle = getDOption(dataModel.datasets[i],
										"strokeStyle", "rgba(32,4,3,0.6)");
					r_xy.drawDataset(dataModel.datasets[i], _gthis.range,  {
						x: 60 + optCoeff(ctx.lineWidth),
						y: canvas.height - 60 - optCoeff(ctx.lineWidth)
					}, _gthis.width, _gthis.height);
				}
			};
			break;
		default:
			throw "Chart type not supported.";
			break;
		// TODO: other data models
	}	
};
