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
		
		/* gets a general (linear) boundary between n datasets of k datapoints */
		getRange: function(datasets, t, length) {
			// t - type (such as "x" or "y")
			// length - dimension to span range across (calculations are adjusted to this)
			var lower = datasets[0][t][0], upper = datasets[0][t][0], incr = 0, incrA = 0;
			// incr - increment
			// incrA - increment (averaged)
			for (var i=0; i<datasets.length; i++)
				for (var j=0, p=datasets[i][t][j]; j<datasets[i][t].length; j++, p=datasets[i][t][j])
					lower = p<lower?p:lower, upper = p>upper?p:upper;
			
			for (var i=0; i<datasets.length; i++) {
				incrA += _this.data.getAvgIncrement(datasets[i][t]);
				incr += _this.data.getIncrement(datasets[i][t]);
			}
			
			var delta = Math.abs(upper-lower);
			// ratios for increments
			var rIncr = (delta/(incr/datasets.length))/length, rIncrA = (delta/(incrA/datasets.length))/length;
			return _this.range(lower, upper, rIncr > 0.04 ? incrA/datasets.length : incr/datasets.length);
		},
		
		/* gets a general (radial) boundary between k datapoints */
		getRadialRange: function(datapoints, t) {
			// t - type (such as "x" or "y")
			var sum = 0;
			for (var i=0; i<datapoints.length; i++)
				sum += datapoints[i][t];
			return _this.range(0, sum, 1);
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
		
		/* creates random y points */
		genRandomValues: function(range, l, wholeNumbers) {
			// l - length of data
			// wholeNumbers - whether or not to use whole numbers
			var vals = [];
			for (var i=0; i<l; i++)
				vals.push(wholeNumbers ? range.lower
						+ Math.round(Math.random()*(range.upper-range.lower))
					: range.lower + Math.random()*(range.upper-range.lower));
			return vals;
		},
		
		// analysis functions:
		/* find y=α+βx, best fit for k elements */
		linearRegression: function(dataset, xrange, yrange, aIncr, minB, maxB, BIncr, xName, yName) {
			var models = [];
			// tweak α and β until best fit
			for (var a=yrange.lower; a<=yrange.upper; a+=aIncr)
				for (var B=minB; B<=maxB; B+=BIncr) {
					// get sum of squared distances S
					var dsum = 0;
					for (var i=0; i<dataset[xName].length && i<dataset[yName].length; i++)
						dsum += Math.pow(dataset[yName][i]-a-B*(dataset[xName][i]-xrange.lower), 2);
					models.push({
						a: parseFloat((a-yrange.lower).toFixed(2)),
						B: parseFloat(B.toFixed(2)),
						S: dsum
					});
				}
			
			// get model with minimum squared distance
			models.sort(function(a,b) { return a.S - b.S; });
			models[0].all = models;
			models[0].string = "y = "+models[0].B+"x + "+models[0].a;
			return models[0];
		},
		
		/* finds standard deviation */
		stdev: function(dataset, t) {
			var avg = 0;
			for (var i=0; i<dataset[t].length; i++)
				avg += dataset[t][i];
			avg /= dataset[t].length;
			var dev = 0;
			for (var i=0; i<dataset[t].length; i++)
				dev += Math.abs(dataset[t][i]-avg);
			return dev / dataset[t].length;
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
			this.drawXLabels = function(xrange, pos, width, theight) {
				// pos - {x: num, y: num}
				// theight - height of text
				theight = typeof theight=="undefined" ? 0 : theight;
				for (var i=0; i<xrange.length; i++)
					ct.fillText(xrange[i], pos.x+i*(width/(xrange.length-1)),
						pos.y + theight/2);
			};
			
			/* draws y-axis range adjacent to the graph */
			this.drawYLabels = function(yrange, pos, height, theight) {
				// pos - {x: num, y: num}
				// theight - height of text
				theight = typeof theight=="undefined" ? 0 : theight;
				for (var i=0; i<yrange.length; i++)
					ct.fillText(yrange[i], pos.x, 
						pos.y-i*(height/(yrange.length-1)) + theight/2);
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
					var x = pos.x+((dset.x[i]-xrange.lower)/(xrange.upper-xrange.lower))*width,
						y = pos.y-((dset.y[i]-yrange.lower)/(yrange.upper-yrange.lower))*height;

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
			
			/* draws an "independent" line across the graph */
			this.drawLine = function(model, xrange, yrange, pos, width, height) {
				// model - { a: y-int, B: slope }
				var start = {
					x: pos.x,
					y: pos.y-(model.a-yrange.lower)/(yrange.upper-yrange.lower)*height
				};
				var final = {
					x: start.x+width,
					y: start.y-((model.B*xrange.upper-yrange.lower)/(yrange.upper-yrange.lower))*height
				};
				ct.beginPath();
				ct.moveTo(start.x, start.y);
				ct.lineTo(final.x, final.y);
				ct.stroke();
				ct.closePath();
				
				// draw label
				var mid = {x: (final.x+start.x)/2, y: (final.y+start.y)/2},
					dist = Math.sqrt(Math.pow(final.x-start.x,2)+Math.pow(final.y-start.y,2));
				ct.save();
				ct.translate(mid.x, mid.y);
				ct.rotate(Math.sin((final.y-start.y)/dist));
				ct.fillText("y = "+model.B+"x"+(model.a?" + "+model.a:""), 0, 0);
				ct.rotate(-Math.sin((final.y-start.y)/dist));
				ct.restore();
			};
		},
		bar: function(ct) {
			/* draw bar-chart labels for a specified length of data */
			this.drawXLabels = function(labels, pos, width) {
				for (var i=0; i<labels.length; i++) {
					ct.save();
					var w = width/labels.length,
						twidth = ct.measureText(labels[i]).width;
					ct.translate(pos.x + (i+1/2)*w, pos.y);
					if (twidth > w) {
						ct.translate(0, Math.sqrt(Math.pow(twidth,2)-Math.pow(w,2)));
						ct.rotate(-Math.cos(w/twidth));
					}
					ct.fillText(labels[i], 0, 0);
					if (twidth > w)
						ct.rotate(Math.cos(w/twidth));
					ct.restore();
				}
			};
			
			/* draws valuation bars */
			this.drawBars = function(dset, labelLen, yrange, pos, width, height, bar, barN) {
				// bar - current bar number (if we have N bars) (starts at 0)
				// barN - number of bars
				var padding = 10;
				// labelLen - number of labels
				for (var i=0; i<labelLen && i<dset.y.length; i++) {
					var x = pos.x+i/labelLen*width + padding/2,
						y = pos.y,
						rwidth = width/labelLen - padding,
						rheight = -((dset.y[i]-yrange.lower)/(yrange.upper-yrange.lower))*height;
					ct.beginPath();
					ct.moveTo(x, y);
					ct.rect(x+rwidth*(bar/barN), y, rwidth/barN, rheight); 
					ct.stroke();
					ct.fill();
					ct.closePath();
				}
			};
			
			/* draws stddev bars */
			this.drawStdev = function(dset, labelLen, yrange, pos, width, height, bar, barN, sStyle) {
				// bar - current bar number (if we have N bars) (starts at 0)
				// barN - number of bars
				// sStyle - stroke style
				var padding = 10, stdpad = 3;
				// stdpad - standard padding
				// labelLen - number of labels
				ct.save();
				ct.strokeStyle = sStyle;
				for (var i=0; i<labelLen && i<dset.y.length; i++) {
					var x = pos.x+i/labelLen*width + padding/2,
						y = pos.y,
						rwidth = width/labelLen - padding,
						rheight = -((dset.y[i]-yrange.lower)/(yrange.upper-yrange.lower))*height,
						start = {x:x, y:y+rheight},
						ydev = _this.data.stdev(dset, "y")/(yrange.upper-yrange.lower)*height;
					ct.beginPath();
					ct.moveTo(start.x+rwidth*(bar/barN)-stdpad, start.y-ydev);
					ct.lineTo(start.x+rwidth*((bar+1)/barN)+stdpad, start.y-ydev);
					ct.stroke();
					ct.closePath();
					ct.beginPath();
					ct.moveTo(start.x+rwidth*((bar+0.5)/barN), start.y-ydev);
					ct.lineTo(start.x+rwidth*((bar+0.5)/barN), start.y+ydev);
					ct.stroke();
					ct.closePath();
					ct.beginPath();
					ct.moveTo(start.x+rwidth*(bar/barN)-stdpad, start.y+ydev);
					ct.lineTo(start.x+rwidth*((bar+1)/barN)+stdpad, start.y+ydev);
					ct.stroke();
					ct.closePath();
				}
				ct.restore();
			};
		},
		pie: function(ct) {
			/* draws the basic pie outline */
			this.drawPie = function(pos, radius) {
				ct.beginPath();
				ct.arc(pos.x, pos.y, radius, 0, Math.PI*2, true);
				ct.stroke();
				ct.closePath();				
			};
			
			/* constructs all of the pie's subsections from given data */
			this.drawDataSections = function(data, vName, pos, vrange, radius) {
				// data - our data points
				// vName - key name to access values
				var off = 0, r = radius-2; // offset from previous value
				for (var i=0; i<data.length; i++) {
					ct.save();
					ct.lineWidth = r;
					ct.strokeStyle = "fillStyle" in data[i] ? 
									data[i].fillStyle : "rgba(135,39,43,0.8)";
					ct.beginPath();
					ct.arc(pos.x, pos.y, r/2, -(off+data[i][vName])/vrange * Math.PI*2, 
						-off/vrange * Math.PI*2, false);
					ct.stroke();
					ct.closePath();
					ct.restore();
					
					// draw separator lines
					ct.save();
					ct.lineWidth = 2;
					ct.strokeStyle = "#fff";
					ct.beginPath();
					ct.moveTo(pos.x, pos.y);
					ct.lineTo(
						pos.x+r*Math.cos((off+data[i][vName])/vrange * Math.PI*2),
						pos.y-r*Math.sin((off+data[i][vName])/vrange * Math.PI*2)
					);
					ct.stroke();
					ct.closePath();
					ct.restore();
					off += data[i][vName];
				}
			};
			
			/* draws appropriate section labels from data */
			this.drawSectionLabels = function(data, vName, pos, vrange, radius) {
				// data - our data contains vData (vName) and individual labels
				var off = 0, r = radius/2; // radius along text
				for (var i=0; i<data.length; i++) {
					if (!("label" in data[i]) || typeof data[i].label != "string") continue;
					ct.save();
					var ang = (off+data[i][vName]/2)/vrange * Math.PI*2;
					var tpos = {
						x: pos.x+r*Math.cos(ang),
						y: pos.y-r*Math.sin(ang)
					};
					ct.translate(tpos.x, tpos.y);
					if (data[i][vName]/vrange < 1) // acute
						ct.rotate(-ang-Math.PI*!(ang>Math.PI));
					ct.fillText(data[i].label, 0, 5);
					if (data[i][vName]/vrange < 1/4)
						ct.rotate(ang+Math.PI*!(ang>Math.PI));
					ct.restore();
					off += data[i][vName];
				}
			};
		},
		radar: function(ct) {
			/* draws ranges around the radar graph */
			this.drawRanges = function(pos, radius, labels, vrange) {
				// construct lines
				for (var p=vrange.lower; p<=vrange.upper; p+=vrange.increment)
					for (var i=0; i<labels.length; i++) {
						var ang = Math.PI/2 + (Math.PI*2) / labels.length;
						ct.beginPath();
						ct.moveTo(
							pos.x+radius*Math.cos(ang),
							pos.y+radius*Math.sin(ang)
						);
						/*
						ct.lineTo(
							
						);*/
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
	var chartIsXYType = type == "scatter" || type == "bar";
	
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
	switch (type) {
		case "scatter":
			this.xrange = Grapher.data.getRange(dataModel.datasets, "x", _gthis.height);
		case "bar":
			this.width = canvas.width-100 + 20*(_gthis.axisLabels.y=="");
			this.height = canvas.height-100 + 20*(_gthis.axisLabels.x=="");
			this.pos = {
				x: 40 + 20*(_gthis.axisLabels.y!=""),
				y: canvas.height-40 - 20*(_gthis.axisLabels.x!="")
			};
			this.yrange = Grapher.data.getRange(dataModel.datasets, "y", _gthis.width);
			break;
		case "pie":
			var offset = 80;
			this.width = canvas.width - offset;
			this.height = canvas.height - offset;
			this.radius = _gthis.width / 2;
			this.pos = {
				x: offset/2 + _gthis.width/2,
				y: offset/2 + _gthis.height/2
			};
			this.vrange = Grapher.data.getRadialRange(dataModel.data, "value");
			break;
		default:
			console.log("Unsupported graph type.");
			break;
		// TODO: MORE GRAPH TYPES
	}
	
	this.type = type;
	
	
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
				
				// draw data points, analysis functions
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
					
					// analysis functions:
					
					// linear regression
					if (getDOption(dataModel.datasets[i], "trendLine", false)) {
						ctx.strokeStyle = getDOption(dataModel.datasets[i],
								"trendLineColor", "rgba(134,134,134,0.7)");
						ctx.fillStyle = getDOption(dataModel.datasets[i],
								"equationColor", "rgba(34,34,34,1)")
						r_xy.drawLine(Grapher.data.linearRegression(dataModel.datasets[i], 
									_gthis.xrange, _gthis.yrange, 1, -10, 10, 0.2, "x", "y"),
							_gthis.xrange, _gthis.yrange, {
								x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
								y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
							}, _gthis.width, _gthis.height);
					}
				}
			};
			break;
		case "bar":
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
					}, _gthis.width, _gthis.height, i, dataModel.datasets.length);
					
					ctx.lineWidth = getDOption(dataModel.datasets[i], "stdevBarWidth", 1);
					// draw standard deviation lines
					if (getDOption(dataModel.datasets[i], "showStdevBars", false))
						r_bar.drawStdev(dataModel.datasets[i], 
							dataModel.labels.length, _gthis.yrange, {
							x: _gthis.pos.x + optCoeff(getOption("axesWidth", 1)),
							y: _gthis.pos.y - optCoeff(getOption("axesWidth", 1))
						}, _gthis.width, _gthis.height, i, dataModel.datasets.length,
						getDOption(dataModel.datasets[i], "stdevBarsStyle", "rgba(124,219,133,0.7)"));
				}
			};
			break;
		case "pie":
			_gthis.render = function() {
				var r_xy = new Grapher.renderers.xy(ctx),
					r_pie = new Grapher.renderers.pie(ctx); // new renderers
				fRenderer(); // do this first
				
				// draw title
				ctx.fillStyle = getOption("titleColor", "rgba(34,34,34,0.9)");
				ctx.font = getOption("titleFont", "18px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawTitle("title" in dataModel ? dataModel.title : "Title", {
					x: optCoeff(getOption("axesWidth", 1)) + canvas.width/2,
					y: 20 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width+50);
				
				// draw main pie
				ctx.strokeStyle = getOption("strokeStyle", "rgba(74,74,74,0.8)");
				r_pie.drawPie(_gthis.pos, _gthis.radius);
				
				// draw pie sections from data
				r_pie.drawDataSections(dataModel.data, "value", _gthis.pos,
											_gthis.vrange.upper, _gthis.radius);
				
				// draw pie section labels from data
				if (getOption("showLabels", true)) {
					ctx.font = getOption("font", "12px Trebuchet MS, Helvetica, sans-serif");
					ctx.fillStyle = getOption("labelColor", "#fff");
					r_pie.drawSectionLabels(dataModel.data, "value", _gthis.pos,
												_gthis.vrange.upper, _gthis.radius);
				}
			};
			break;
		case "radar":
			_gthis.render = function() {
				var r_xy = new Grapher.renderers.xy(ctx);
				fRenderer(); // do this first

				// draw title
				ctx.fillStyle = getOption("titleColor", "rgba(34,34,34,0.9)");
				ctx.font = getOption("titleFont", "18px Trebuchet MS, Helvetica, sans-serif");
				r_xy.drawTitle("title" in dataModel ? dataModel.title : "Title", {
					x: optCoeff(getOption("axesWidth", 1)) + canvas.width/2,
					y: 20 + optCoeff(getOption("axesWidth", 1))
				}, _gthis.width+50);
				
				
			};
			break;
		default:
			throw "Chart type not supported.";
			break;
		// TODO: other data models
	}	
};
