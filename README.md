grapher.js
==========

A data visualization API for the web (a middle ground between Chart.js and D3.js). Idea for PennApps 2014.

Example usage: 
```HTML
<canvas id="graph1">Your browser does not support HTML5 canvas.</canvas>
```
```JavaScript
var graph = new Graph(document.getElementById("graph1"), "scatter",
	{ // information (data) goes here
		title: "Relationship Between Boilerplate Temperature and Time",
		xlabel: "Time (s)",
		ylabel: "Temperature (deg C)",
		datasets: [
			{ // data set 1
				pointSize: 4,
				pointLineWidth: 2,
				drawLines: true,
				strokeStyle: "rgba(142,35,52,0.7)",
				x: Grapher.range(0,6),
				y: [23, 41, 39, 4, 1, 43]
			}
		]
	},
	{ // options go here
		bgColor: "#fbfbfb",
		axesColor: "rgba(24,20,24,0.8)",
		axesWidth: 1,
		sharpLines: true,
		labelColor: "rgba(44,44,44,0.9)",
		labelFont: "10px Arial",
		gridLines: true,
		rCallback: function() { 
			console.log("Rendered a frame successfully.");
		},
		eCallback: function() {
			console.log("An error occurred.");
		}
	}
);

// render the graph
Grapher.render(graph);
```
