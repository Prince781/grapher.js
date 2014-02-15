grapher.js
==========

A data visualization API for the web (a middle ground between Chart.js and D3.js). Idea for PennApps 2014.

Example usage: 
```HTML
<canvas id="graph">Your browser does not support HTML5 canvas.</canvas>
```
```JavaScript
var graph = new Graph(document.getElementById("graph"), "scatter",
	{ // data goes here
		title: "Relationship Between Boilerplate Temperature and Time",
		xdata: Grapher.range(0, 130),
		ydata: [130, 249, 49, 14, 34],
	},
	{ // options go here
		axesColor: "rgba(24,20,24,0.8)",
		axesWidth: 1,
		rCallback: function() { 
			console.log("Rendered a frame successfully.") 
		},
		eCallback: function() {
			console.log("An error occurred.")
		}
	}
);

// render the graph
Grapher.render(graph);
```
