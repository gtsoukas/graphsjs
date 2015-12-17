/**
 * Directed graph with linear layout
 * 
 * */
 
function Arcbar(htmlelement, nodes, links){
  
	me = this;

	this.nodes = nodes;
	this.links = links;

	this.margin = {top: 20, right: 20, bottom: 20, left: 70};
	this.width = 1200 - this.margin.left - this.margin.right;
    this.height = 600 - this.margin.top - this.margin.bottom;
	this.radius = 2;
	this.yfixed = 300;

	this.formatAbsolute = d3.format(",g");

	nodes.forEach(function(d){
		d.outlinks = [];
		d.inlinks = [];	
	});

    // map to objects instead of indices
    links.forEach(function(d, i) {
        d.source = isNaN(d.source) ? d.source : nodes[d.source];
        d.target = isNaN(d.target) ? d.target : nodes[d.target];
	
		//add links references to the nodes
		//d.source.outlinks.push(d);
		//d.target.inlinks.push(d);
    });

	this.valuescale = d3.scale.linear()
		.range([this.yfixed,0])
		.domain([0, d3.max(nodes, function(d) { return d.value; })]);

	this.colorscale = d3.scale.category20();

	this.yAxis = d3.svg.axis()
	  .scale(this.valuescale)
	  .orient("left");

	this.svg = d3.select(htmlelement)
		.append("svg")
			.attr("class", "arcbar")
			.attr("width", this.width + this.margin.left + this.margin.right)
			.attr("height", this.height + this.margin.top + this.margin.bottom)
		.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	this.svg.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(-8,0)")
		.call(this.yAxis)
    /*.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("value");*/

	nodes.sort(function(a, b) {
	    return b.value - a.value;
	})

    // linear layout
	var xscale = d3.scale.linear()
	    .domain([0, nodes.length - 1])
		.range([me.radius, me.width]);

	nodes.forEach(function(d, i) {
	    d.x = xscale(i);
	    d.y = me.yfixed;
	});

    drawLinks(links);

    this.svg.selectAll(".node")
		.data(nodes)
		.enter()
		.append("circle")
		.attr("class", "node")
		.attr("cx", function(d, i) { return d.x; })
		.attr("cy", function(d, i) { return d.y; })
		.attr("r", function(d, i) { return me.radius; })
		.style("fill", function(d, i) { return me.colorscale(d.group); })
		.on("mouseenter",function(d){ me.highlight(d); })
		.append("svg:title")
   			.text(function(d) { return d.name+": "+me.formatAbsolute(d.value); });

	// draw bars
	// a node-"foot" may be required for those nodes with zero values.
	this.svg.selectAll(".bar")
		.data(nodes)
			.enter().append("rect")
				.attr("class", "bar")
				.attr("x", function(d, i) { return d.x-2; })
				.attr("width", me.radius*2)
				.attr("y", function(d, i) { return me.valuescale(d.value); })
				.attr("height", function(d){return me.yfixed - me.valuescale(d.value);})
				.style("fill", function(d, i) { return me.colorscale(d.group); })
				.on("mouseenter",function(d){ me.highlight(d); })
				.append("svg:title")
   					.text(function(d) { return d.name+": "+me.formatAbsolute(d.value); });


	// draw links
	function drawLinks(links) {
		// scale to generate radians (just for lower-half of circle)
		var radians = d3.scale.linear()
		    .range([Math.PI / 2, 3 * Math.PI / 2]);

		// path generator for arcs (uses polar coordinates)
		var arc = d3.svg.line.radial()
		    .interpolate("basis")
		    .tension(0)
		    .angle(function(d) { return radians(d); });

		// add links
		me.svg.selectAll(".link")
		    .data(links)
		    .enter()
		    .append("path")
		    .attr("class", "link")
		    .attr("transform", function(d, i) {
		        // arc will always be drawn around (0, 0)
		        // shift so (0, 0) will be between source and target
		        var xshift = d.source.x + (d.target.x - d.source.x) / 2;
		        var yshift = me.yfixed;
		        return "translate(" + xshift + ", " + yshift + ")";
		    })
		    .attr("d", function(d, i) {
		        // get x distance between source and target
		        var xdist = Math.abs(d.source.x - d.target.x);

		        // set arc radius based on x distance
		        arc.radius(xdist / 2);

		        // want to generate 1/3 as many points per pixel in x direction
		        var points = d3.range(0, Math.ceil(xdist / 3));

		        // set radian scale domain
		        radians.domain([0, points.length - 1]);

		        // return path for arc
		        return arc(points);
		    });
		}

}
 
 
 
Arcbar.prototype = {
  
	constructor: Arcbar,
	
	/**
	* highlight a node and its links
	* */
	highlight: function(d){

		var focusname = d.name;

		me.svg.selectAll(".link")
			.style("stroke", function(d){

				if(d.source.name == focusname){ 
					return "red";
				}
				if(d.target.name == focusname){ 
					return "blue";
				}
				else {
					return undefined;				
				}
			})
			.style("stroke-opacity", function(d){

				if(d.source.name == focusname){ 
					return 1;
				}
				else {
					return undefined;				
				}
			});
	}
  
}
