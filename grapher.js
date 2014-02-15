/***********************************************
 * grapher.js
 * A simple API for data visualization on the
 *  web.
 * PennApps - PF (February 2014)
************************************************/
"use strict";

var Grapher = new function() {
	var _this = this;
	
	this.
	
	/* renders a particular Graph (termed "GraphModel" here) */
	this.render = function(GraphModel, options) {
		if (!(GraphModel instanceof Graph))
			throw "Grapher: Cannot render something other than a Graph";
		
		try { // actually render
			GraphModel.render();
			GraphModel.rCallback();
		} catch (e) {
			try { GraphModel.eCallback(); } catch (e) {} // callback
			console.log("GraphModel error: "+e.description);
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
	if (canvas.tagName != "canvas")
		throw "GraphModel: param \"canvas\" is not actually a <canvas> element.";

	var _gthis = this;
	
	// private:
	var ctx = canvas.getContext("2d");
	
	this.type = type;
	this.idata = []; // contains independent variables/labels
	this.ddata = []; // contains dependent variables/labels
	
	this.rCallback = typeof rCallback == "function" ? rCallback : function(){}; // on successful render
	this.eCallback = typeof eCallback == "function" ? eCallback : function(){}; // on error
	
	// dataModel varies between types
	switch (type) {
		case "scatter":
			_gthis.render = function() {
				fRenderer(); // do this first
			};
			break;
		default:
			console.log("Chart type not supported.");
			break;
		// TODO: other data models
	}	
};
