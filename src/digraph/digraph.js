/**
 * Directed graph with force based layout
 *
 * Links must contain a source and a target property which point to the array
 * index of the corresponing nodes.
 *
 * */

function Digraph(htmlelement, nodes, links, confobj){

  me = this;

  this.htmlelement = htmlelement;
  this.nodes = nodes;
  this.links = links;

  this.confobj = (typeof confobj === 'undefined')? {} : confobj;

  if(typeof this.confobj.width === 'undefined'){
    this.confobj.width = 960;
  }

  if(typeof this.confobj.height === 'undefined'){
    this.confobj.height = 660;
  }

  this.margin = {top: 20, right: 20, bottom: 20, left: 20};
  this.width = this.confobj.width - this.margin.left - this.margin.right;
  this.height = this.confobj.height - this.margin.top - this.margin.bottom;

  this.formatAbsolute = d3.format(",g");

  if(typeof this.confobj.MIN_NODE_RADIUS === 'undefined'){
    this.confobj.MIN_NODE_RADIUS = 6;
  }

  if(typeof this.confobj.MAX_NODE_RADIUS === 'undefined'){
    this.confobj.MAX_NODE_RADIUS = 18;
  }

  if(typeof this.confobj.MIN_LINK_THICKNESS === 'undefined'){
    this.confobj.MIN_LINK_THICKNESS = 1;
  }

  if(typeof this.confobj.MAX_LINK_THICKNESS === 'undefined'){
    this.confobj.MAX_LINK_THICKNESS = 6;
  }

  // in pixels
  this.MIN_NODE_RADIUS = this.confobj.MIN_NODE_RADIUS;
  this.MAX_NODE_RADIUS = this.confobj.MAX_NODE_RADIUS;
  this.MIN_LINK_THICKNESS = this.confobj.MIN_LINK_THICKNESS;
  this.MAX_LINK_THICKNESS = this.confobj.MAX_LINK_THICKNESS;

  this.nodescale = d3.scale.linear()
    .range([me.MIN_NODE_RADIUS, me.MAX_NODE_RADIUS])
    .domain(d3.extent(nodes, function(d) { return d.value; }));

  this.linkscale = d3.scale.linear()
    .range([me.MIN_LINK_THICKNESS, me.MAX_LINK_THICKNESS])
    .domain(d3.extent(links, function(d) { return d.value; }));

  // map to objects instead of indices
  this.links.forEach(function(d, i) {
    d.source = isNaN(d.source) ? d.source : nodes[d.source];
    d.target = isNaN(d.target) ? d.target : nodes[d.target];
  });

  this.nodes.forEach(function(n){n.radius = Math.round(me.nodeRadius(n))+10;});

  this.svg = d3.select(htmlelement)
    .append("svg")
      .attr("class", "digraph")
      .attr("width", me.width)
      .attr("height", me.height)
    .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

}


Digraph.prototype = {

  constructor: Digraph,

  /**
  *
  * */
  nodeRadius: function(d){
    return me.nodescale(d.value); //TODO: area proportional to value?
  },

  /**
  *
  * */
  nodetext: function(d) {
    //return d.name + ", "+me.formatAbsolute(d.value);
    return d.name;
  },

  /**
  *
  * */
  nodeColor: function(d){
    return undefined;
  },

  /**
  * compute force based layout
  *
  * callback can be used to trigger e.g. drawing once the layout is computed.
  *
  * */
  forceLayout: function(callback, confobj){

    var confobj;

    if(typeof confobj === 'undefined') {confobj={}};

    if(typeof confobj.charge === 'undefined'){ confobj.charge = -250;}
    if(typeof confobj.gravity === 'undefined'){ confobj.gravity = 0.3;}

  	var force = d3.layout.force()
  		.nodes(d3.values(me.nodes))
  		.links(me.links)
  		.size([me.width, me.height])
  		//.linkDistance(50)
  		.charge(confobj.charge)
  		.gravity(confobj.gravity)
  		.on("tick", tick)
      .on("end", callback)
  		.start();

      function tick(e) {

    		console.log("tick");

    		var q = d3.geom.quadtree(me.nodes),
    		  i = 0,
    		  n = me.nodes.length;

    	  while (++i < n) q.visit(collide(me.nodes[i]));

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

  },

  /**
	* draw the graph, assuming a layout has been computed
	* */
	draw: function(){

    // build the arrow.
    me.svg.append("svg:defs").selectAll("marker")
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
    var path = me.svg.append("svg:g").selectAll("path")
      .data(me.links)
      .enter().append("svg:path")
      .attr("class", "link")
      .style("stroke-width", function(d){
        return me.linkscale(d.value);
      })
      .attr("marker-end", "url(#end)");

    //me.svg.selectAll("path")
    //  .append("title")
        //.text(function(d) { return d.source.name+" "+d.source.name+" "+d.value; });

    // define the nodes
    var node = me.svg.selectAll(".node")
      .data(me.nodes)
      .enter().append("g")
      .attr("class", "node")
      //.call(force.drag)
      ;

    // add the nodes
    node.append("circle")
      .attr("r", me.nodeRadius)
      .style("fill", me.nodeColor)
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

        var offset = 1.1 * me.nodeRadius(d.target);
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


	},


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
