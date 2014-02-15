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
			arr.push(parseFloat(i.toFixed(2)));
		
		arr.lower = l;
		arr.upper = u;
		arr.increment = incr;
		return arr;
	};
	
	// specific data-manipulation functions:
	this.data = {
		/* determines if our dataset contains a floating point */
		hasDecimal: function(dataset) {
			for (var i=0; i<dataset.length; i++)
				if (dataset[i] % 1 != 0) return true;
			return false;
		},
		
		/* gets a general distance between points k,k+1 using range */
		getIncrement: function(dataset) {
			var ndataset = dataset.slice(0).sort(function(a,b) { return a-b; });
			var nnum = (ndataset[ndataset.length-1]-ndataset[0])/(ndataset.length-1);
			return _this.data.hasDecimal(dataset) ? parseFloat(nnum.toFixed(2)) : Math.round(nnum);
		},
		
		/* gets a general distance between points k,k+1 using arithmetic mean */
		getAvgIncrement: function(dataset) {
			var isum = 0;
			for (var i=1; i<dataset.length; i++)
				isum += Math.abs(dataset[i]-dataset[i-1]);
			return isum/(dataset.length-1) == 0 ? 1 : isum/(dataset.length-1);
		},
		
		/* gets a general boundary between n datasets of k datapoints */
		getRange: function(datasets, t) {
			// t - type (such as "x" or "y")
			var lower = datasets[0][t][0], upper = datasets[0][t][0], incr = 0;
			for (var i=0; i<datasets.length; i++) {
				incr += _this.data.getIncrement(datasets[0][t]);
				for (var j=0, p=datasets[i][t][j]; j<datasets[i][t].length; j++, p=datasets[i][t][j])
					lower = p<lower?p:lower, upper = p>upper?p:upper;
			}
			return _this.range(lower, upper, incr/datasets.length);
		},
		
		/* creates a dataset object from another object */
		toDataset: function(dataset, keyName, valName) {
			var keys = [], vals = [];
			for (var i=0; i<dataset[keyName].length && i<dataset[valName].length; i++) {
				keys[i] = dataset[keyName][i];
				vals[i] = dataset[valName][i];
			}
			return {x: keys, y: vals};
		},
		
		/* find y=α+βx, best fit for k elements */
		linearRegression: function(dataset, xrange, yrange, aIncr, minB, maxB, BIncr, xName, yName) {
			var models = [];
			// tweak α and β until best fit
			for (var a=yrange.lower; a<=yrange.upper; a+=aIncr)
				for (var B=minB; B<=maxB; B+=BIncr) {
					// get sum of squared distances S
					var dsum = 0;
					for (var i=0; i<dataset[xName].length && i<dataset[yName].length; i++)
						dsum += Math.pow(dataset[yName][i] - a - B*dataset[xName][i], 2);
					models.push({
						a: a,
						B: B,
						S: dsum
					});
				}
			
			// get model with minimum squared distance
			models.sort(function(a,b) { return a.S - b.S; });
			return models[0];
		}
	};
	
	// specific render functions:
	this.renderers = {
		misc: function(ct) {
			this.cutTextToLength = function(text, length) {
				var ellipLen = ct.measureText("...").width;
				// cut off overflowing text
				if (ct.measureText(text).width > length) {
					while (ct.measureText(text).width+ellipLen > length && text.length > 0)
						text = text.substr(0,text.length-1);
					text += "...";
				}
				return text;
			};
		},
		xy: function(ct) {
			// ct - context
			/* draws a title at the top of the chart */
			this.drawTitle = function(text, pos, width) {
				// text - title text
				var miscRenderer = new _this.renderers.misc(ct);
				text = miscRenderer.cutTextToLength(text, width);
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
			
			/* draws xy gridlines for a scatter/box plot */
			this.drawGridlines = function(pos, width, height, orientation, range) {
				// orientation = {0: y-axis, 1: x-axis} length=height,length=width
				// pos - {x: num, y: num}
				for (var i=0; i<range.length; i++) {
					var spos = {
						x: pos.x+i*(!orientation)*(width/(range.length-1)),
						y: pos.y-i*orientation*(height/(range.length-1))
					};
					ct.beginPath();
					ct.moveTo(spos.x, spos.y);
					ct.lineTo(spos.x+orientation*width, spos.y-(!orientation)*height);
					ct.stroke();
					ct.closePath();
				}
			};
			
			/* draws x-labels underneath the graph */
			this.drawXLabels = function(xrange, pos, width) {
				// pos - {x: num, y: num}
				for (var i=0; i<xrange.length; i++)
					ct.fillText(xrange[i], pos.x+i*(width/(xrange.length-1)), pos.y);
			};
			
			/* draws y-axis range adjacent to the graph */
			this.drawYLabels = function(yrange, pos, height) {
				// pos - {x: num, y: num}
				for (var i=0; i<yrange.length; i++)
					ct.fillText(yrange[i], pos.x, pos.y-i*(height/(yrange.length-1)));
			};
			
			/* draws an axis label across the x-axis */
			this.drawXAxisLabel = function(text, pos, width) {
				var miscRenderer = new _this.renderers.misc(ct);
				text = miscRenderer.cutTextToLength(text, width);
				ct.fillText(text, pos.x, pos.y);
			};
			
			/* draws an axis label across the y-axis */
			this.drawYAxisLabel = function(text, pos, width) {
				var miscRenderer = new _this.renderers.misc(ct);
				text = miscRenderer.cutTextToLength(text, width);
				ct.rotate(-Math.PI/2);
				ct.fillText(text, -pos.y, pos.x);
				ct.rotate(Math.PI/2);
			};
			
			/* draws xy-datapoints across the graph */
			this.drawDataset = function(dset, xrange, yrange, pos, width, height) {
				// dset - our data set {x: ,y: }
				// range - array of range data
				// pos - starting point to draw data
				// width, height - boundaries of data drawings
				var init = true, drawLines = ("drawLines" in dset)?dset.drawLines:false;
				for (var i=0; i<dset.x.length && i<dset.y.length; i++) {
					var x = pos.x+(dset.x[i]/xrange.upper)*width,
						y = pos.y-(dset.y[i]/yrange.upper)*height;

					if (!init && drawLines) {
						init = false;
						ct.lineTo(x, y); // from lpos.x,lpos.y
						ct.stroke();
						ct.closePath();
					} else init = false;
					
					// draw data circle
					ct.beginPath();
					ct.arc(x, y, ("pointSize" in dset) ? dset.pointSize : 4, 0, Math.PI*2);
					ct.stroke();
					ct.fill();
					ct.closePath();
					
					// prepare for next node in line
					if (i < dset.x.length - 1 && drawLines) {
						var llWidth = ct.lineWidth; // save old line width
						ct.lineWidth += 2;
						ct.beginPath();
						ct.moveTo(x, y);
						ct.lineWidth = llWidth;
					}
				}
			};
		},
		bar: function(ct) {
			/* draw bar-chart labels for a specified length of data */
			this.drawXLabels = function(labels, pos, width) {
				for (var i=0; i<labels.length; i++)
					ct.fillText(labels[i], pos.x + (i + 1/2)*width/labels.length, pos.y);
			};
			
			/* draws valuation bars */
			this.drawBars = function(dset, labelLen, yrange, pos, width, height) {
				var padding = 10;
				// labelLen - number of labels
				for (var i=0; i<labelLen && i<dset.y.length; i++) {
					var x = pos.x+i/labelLen*width + padding/2,
						y = pos.y,
						rwidth = width/labelLen - padding;
					ct.beginPath();
					ct.moveTo(x, y);
					ct.rect(x, y, rwidth, -(dset.y[i]/yrange.upper)*height); 
					ct.stroke();
					ct.fill();
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
	
	
	// default render functions:
	function fRenderer() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	function optCoeff(num) {
		// optimized coefficient (numbers%2==1 need 0.5, else do not)
		return getOption("sharpLines", true) ? (num%2 ? 0.5 : 0) : 0;
	}
	
	this.axisLabels = {
		x: ("xlabel" in dataModel) ? dataModel.xlabel : "",
		y: ("ylabel" in dataModel) ? dataModel.ylabel : ""
	};
	
	// geometry of the actual graph frame
	this.width = canvas.width-100 + 20*(_gthis.axisLabels.y=="");
	this.height = canvas.height-100 + 20*(_gthis.axisLabels.x=="");
	this.pos = {
		x: 40 + 20*(_gthis.axisLabels.y!=""),
		y: canvas.height-40 - 20*(_gthis.axisLabels.x!="")
	};

	this.type = type;
	if (type == "scatter")
		this.xrange = Grapher.data.getRange(dataModel.datasets, "x");
	this.yrange = Grapher.data.getRange(dataModel.datasets, "y");
	
	this.rCallback = getOption("rCallback", function(){}); // on successful render
	this.eCallback = getOption("eCallback", function(){}); // on error
	
	// dataModel varies between types
	switch (type) {
		case "scatter":
			_gthis.render = function() {
				var r_xy = new Grapher.renderers.xy(ctx); // create a new xy renderer
				fRenderer(); // do this first
				
				// fill background color
				ctx.fillStyle = getOption("bgColor", "rgba(0,0,0,0)");
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// draw axes
				ctx.lineWidth = getOption("axesWidth", 1);
				ctx.strokeStyle = getOption("axesColor", "rgba(124,124,124,0.95)");
				r_xy.drawAxes({
					x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
				}, _gthis.width, _gthis.height);
				
				// draw title
				ctx.fillStyle = getOption("titleColor", "rgba(34,34,34,0.9)");
				ctx.font = getOption("titleFont", "18px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawTitle("title" in dataModel ? dataModel.title : "Title", {
					x: optCoeff(getOption("axesWidth", 1)) + canvas.width/2,
					y: 20 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width+50);
				
				// add xy-labels
				ctx.fillStyle = getOption("labelColor", "rgba(64,64,64,0.9)");
				ctx.font = getOption("labelFont", "12px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawXLabels(_gthis.xrange, {
					x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y + 20 - optCoeff(getOption("axesWidth", 1))
				}, _gthis.width);
				r_xy.drawYLabels(_gthis.yrange, {
					x: _gthis.pos.x - 20 + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
				}, _gthis.height);
				
				// add xy-axis labels
				ctx.fillStyle = getOption("labelColor", "rgba(64,64,64,0.9)");
				ctx.font = getOption("axesFont", "12px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawXAxisLabel(_gthis.axisLabels.x, {
					x: _gthis.pos.x + _gthis.width/2 + optCoeff(getOption("axesWidth", 2)),
					y: _gthis.pos.y + 45 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width);
				r_xy.drawYAxisLabel(_gthis.axisLabels.y, {
					x: _gthis.pos.x - 45 + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - _gthis.height/2 + optCoeff(getOption("axesWidth", 2))
				}, _gthis.height);
				
				// add xy gridlines
				if (getOption("gridLines", false)) {
					ctx.strokeStyle = getOption("gridLineColor", "rgba(164,164,164,0.9)");
					r_xy.drawGridlines({ // draw along x axis
						x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
						y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
					}, _gthis.width, _gthis.height, false, _gthis.xrange);
					r_xy.drawGridlines({ // draw along y axis
						x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
						y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
					}, _gthis.width, _gthis.height, true, _gthis.yrange);
				}
				
				// draw data points
				for (var i=0; i<dataModel.datasets.length; i++) {
					ctx.fillStyle = getDOption(dataModel.datasets[i], "fillStyle", "rgba(210,210,210,0.3)");
					ctx.strokeStyle = getDOption(dataModel.datasets[i],
										"strokeStyle", "rgba(32,4,3,0.6)");
					ctx.lineWidth = getDOption(dataModel.datasets[i], "pointLineWidth", 2);
					r_xy.drawDataset(dataModel.datasets[i], 
						_gthis.xrange, _gthis.yrange, {
						x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
						y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
					}, _gthis.width, _gthis.height);
				}
			};
			break;
		case "bar": // TODO: bar chart
			_gthis.render = function() {
				var r_xy = new Grapher.renderers.xy(ctx), // create a new xy renderer
					r_bar = new Grapher.renderers.bar(ctx);
				fRenderer(); // do this first
				
				// fill background color
				ctx.fillStyle = getOption("bgColor", "rgba(0,0,0,0)");
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// draw axes
				ctx.lineWidth = getOption("axesWidth", 1);
				ctx.strokeStyle = getOption("axesColor", "rgba(124,124,124,0.95)");
				r_xy.drawAxes({
					x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
				}, _gthis.width, _gthis.height);
				
				// draw title
				ctx.fillStyle = getOption("titleColor", "rgba(34,34,34,0.9)");
				ctx.font = getOption("titleFont", "18px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawTitle("title" in dataModel ? dataModel.title : "Title", {
					x: optCoeff(getOption("axesWidth", 1)) + canvas.width/2,
					y: 20 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width+50);
				
				// add y-labels
				ctx.fillStyle = getOption("labelColor", "rgba(64,64,64,0.9)");
				ctx.font = getOption("labelFont", "12px Trebuchet MS, Helvetica, sans-serif");
				r_bar.drawXLabels(dataModel.labels, {
					x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y + 20 - optCoeff(getOption("axesWidth", 1))
				}, _gthis.width);
				// add y-labels
				r_xy.drawYLabels(_gthis.yrange, {
					x: _gthis.pos.x - 20 + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
				}, _gthis.height);
				
				// add xy-axis labels
				ctx.fillStyle = getOption("labelColor", "rgba(64,64,64,0.9)");
				ctx.font = getOption("axesFont", "12px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawXAxisLabel(_gthis.axisLabels.x, {
					x: _gthis.pos.x + _gthis.width/2 + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y + 45 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width);
				r_xy.drawYAxisLabel(_gthis.axisLabels.y, {
					x: _gthis.pos.x - 45 + optCoeff(getOption("axesWidth", 1)),
					y: _gthis.pos.y - _gthis.height/2 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.height);
				
				// add y gridlines
				if (getOption("gridLines", false)) {
					ctx.strokeStyle = getOption("gridLineColor", "rgba(164,164,164,0.9)");
					r_xy.drawGridlines({ // draw along y axis
						x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
						y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
					}, _gthis.width, _gthis.height, true, _gthis.yrange);
				}
				
				// draw data bars
				for (var i=0; i<dataModel.datasets.length; i++) {
					ctx.fillStyle = getDOption(dataModel.datasets[i], 
									"fillStyle", "rgba(23,23,123,0.8)");
					ctx.strokeStyle = ctx.fillStyle;
					ctx.lineWidth = getDOption(dataModel.datasets[i], "outlineWidth", 2);
					ctx.font = getDOption(dataModel.datasets[i], "font", 
									"12px Trebuchet MS, Helvetica, sans-serif");
					r_bar.drawBars(dataModel.datasets[i], 
						dataModel.labels.length, _gthis.yrange, {
						x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
						y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
					}, _gthis.width, _gthis.height);
				}
				
				// TODO: draw xy labels, data
			};
			break;
		default:
			throw "Chart type not supported.";
			break;
		// TODO: other data models
	}	
};
