/**
 * Directed graph with force based layout
 * 
 * */
 
function Digraph(htmlelement, nodes, links){

	me = this;
   
  	this.margin = {top: 20, right: 20, bottom: 20, left: 20};
    this.width = 960 - this.margin.left - this.margin.right;
    this.height = 660 - this.margin.top - this.margin.bottom;

	this.formatAbsolute = d3.format(",g");

	// in pixels
	this.MIN_NODE_RADIUS = 6;
	this.MAX_NODE_RADIUS = 18;
	this.MIN_LINK_THICKNESS = 1;
	this.MAX_LINK_THICKNESS = 6;

	this.nodescale = d3.scale.linear()
		.range([me.MIN_NODE_RADIUS, me.MAX_NODE_RADIUS])
		.domain(d3.extent(nodes, function(d) { return d.value; }));

	this.linkscale = d3.scale.linear()
		.range([me.MIN_LINK_THICKNESS, me.MAX_LINK_THICKNESS])
		.domain(d3.extent(links, function(d) { return d.value; }));

	function nodeRadius(d){
		//x= Math.round( Math.sqrt((me.nodescale(d.value)/me.MAX_NODE_RADIUS)/Math.PI) );  //area proportional to value
		//console.log(x);
		//return x;
		return me.nodescale(d.value); //TODO: area proportional to value?
	}

	this.nodetext = function(d) {
		//return d.name + ", "+me.formatAbsolute(d.value);
		return d.name;
	};

	function nodeColor(d){
		return undefined;
	}

	// map to objects instead of indices
    links.forEach(function(d, i) {
        d.source = isNaN(d.source) ? d.source : nodes[d.source];
        d.target = isNaN(d.target) ? d.target : nodes[d.target];
    });

	nodes.forEach(function(n){n.radius = Math.round(nodeRadius(n))+10;});

	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links)
		.size([me.width, me.height])
		//.linkDistance(50)
		.charge(-250)
		.gravity(0.3)
		.on("tick", tick)
		.start();

	this.svg = d3.select(htmlelement)
		.append("svg")
			.attr("class", "digraph")
			.attr("width", me.width)
			.attr("height", me.height)
		.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	// build the arrow.
	this.svg.append("svg:defs").selectAll("marker")
		.data(["end"])
	  .enter().append("svg:marker")
		.attr("id", String)
		.attr("markerUnits", "userSpaceOnUse")
		.attr("viewBox", "0 -5 10 10")
		.attr("refX", 10)
		.attr("refY", 0)
		.attr("markerWidth", 6)
		.attr("markerHeight", 6)
		.attr("orient", "auto")
	  .append("svg:path")
		.attr("d", "M0,-5L10,0L0,5")
		.style("fill", "black");

	// add the links and the arrows
	var path = this.svg.append("svg:g").selectAll("path")
		.data(force.links())
	  .enter().append("svg:path")
		.attr("class", "link")
		.style("stroke-width", function(d){
			return me.linkscale(d.value);
		})
		.attr("marker-end", "url(#end)");
		//.append("svg:title")
   		//	.text(function(d) { return d.source.name+" "+d.source.name+" "+d.value; }); 

	// define the nodes
	var node = this.svg.selectAll(".node")
		.data(force.nodes())
	  .enter().append("g")
		.attr("class", "node")
		.call(force.drag);

	// add the nodes
	node.append("circle")
		.attr("r", nodeRadius)
		.style("fill", nodeColor)
		.on("mouseover", function(d){
			me.highlight(d);
		})
		.append("svg:title")
   			.text(function(d) { return d.name+": "+me.formatAbsolute(d.value); });

	// add the text 
	/*node.append("text")
		//.attr("x", 12)
		.attr("dy", ".35em")
		.style("text-anchor", "middle")
		//.style("fill","orange")
		.text(me.nodetext);*/

	function tick(e) {
		
		console.log("tick");
		
		var q = d3.geom.quadtree(nodes),
		  i = 0,
		  n = nodes.length;

	  while (++i < n) q.visit(collide(nodes[i]));

	  me.svg.selectAll("circle")
		  .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; });

		// add the curvy lines
		// see also: http://stackoverflow.com/questions/15495762/linking-nodes-of-variable-radius-with-arrows?rq=1
		path
			/*.attr("d", function(d) {
				var dx = d.target.x - d.source.x,
				    dy = d.target.y - d.source.y,
				    dr = Math.sqrt(dx * dx + dy * dy);
				return "M" + 
				    d.source.x + "," + 
				    d.source.y + "A" + 
				    dr + "," + dr + " 0 0,1 " + 
				    d.target.x + "," + 
				    d.target.y;
			})*/
			.attr("d", function(d) {
				var tightness = -3.0;
				if(d.type == "straight")
				    tightness = 1000;

				// Places the control point for the Bezier on the bisection of the
				// segment between the source and target points, at a distance
				// equal to half the distance between the points.
				var dx = d.target.x - d.source.x;
				var dy = d.target.y - d.source.y;
				var dr = Math.sqrt(dx * dx + dy * dy);
				var qx = d.source.x + dx/2.0 - dy/tightness;
				var qy = d.source.y + dy/2.0 + dx/tightness;

				// Calculates the segment from the control point Q to the target
				// to use it as a direction to wich it will move "node_size" back
				// from the end point, to finish the edge aprox at the edge of the
				// node. Note there will be an angular error due to the segment not
				// having the same direction as the curve at that point.
				var dqx = d.target.x - qx;
				var dqy = d.target.y - qy;
				var qr = Math.sqrt(dqx * dqx + dqy * dqy);

				var offset = 1.1 * nodeRadius(d.target);
				var tx = d.target.x - dqx/qr* offset;
				var ty = d.target.y - dqy/qr* offset;

				return "M" + d.source.x + "," + d.source.y + "Q"+ qx + "," + qy 
				        + " " + tx + "," + ty;  // to "node_size" pixels before
				        //+ " " + d.target.x + "," + d.target.y; // til target
			  })
			  .on("mouseover", function(d){
				console.log(d.source.name+"->"+d.target.name+" "+d.value);
			});


			//node
			//    .attr("transform", function(d) { 
		  	//    return "translate(" + d.x + "," + d.y + ")"; });


	}

	function collide(node) {
	  var r = node.radius + 32,
		//r = nodeRadius(node) + 16,
		  nx1 = node.x - r,
		  nx2 = node.x + r,
		  ny1 = node.y - r,
		  ny2 = node.y + r;
	  return function(quad, x1, y1, x2, y2) {
		if (quad.point && (quad.point !== node)) {
		  var x = node.x - quad.point.x,
		      y = node.y - quad.point.y,
		      l = Math.sqrt(x * x + y * y),
		      r = node.radius + quad.point.radius;
		  if (l < r) {
		    l = (l - r) / l * .5;
		    node.x -= x *= l;
		    node.y -= y *= l;
		    quad.point.x += x;
		    quad.point.y += y;
		  }
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	  };
	}

}


Digraph.prototype = {
  
	constructor: Digraph,
	
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
			.style("opacity", function(d){

				if(d.source.name == focusname || d.target.name == focusname){ 
					return 1;
				}
				else {
					return undefined;				
				}
			});
	}
  
}
