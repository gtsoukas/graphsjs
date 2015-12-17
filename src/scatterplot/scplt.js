/**
 * Scatterplot with labels that try not to overlap each other.
 *
 * TODO: collision detection on labels
 * 
 * */
 
function Scatterplot(htmlelement, data){
  
	me = this;
   
  	this.margin = {top: 40, right: 70, bottom: 70, left: 70};
	this.width = 600 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
 
	this.x = d3.scale.linear()
		.range([0, this.width])
		.domain(d3.extent(data, function(d) { return d.x; })).nice();

	this.y = d3.scale.linear()
		.range([this.height, 0])
		.domain(d3.extent(data, function(d) { return d.y; })).nice();

	this.xAxis = d3.svg.axis()
		.scale(this.x)
		.orient("bottom");

	this.yAxis = d3.svg.axis()
		.scale(this.y)
		.orient("left");
  
	// turn data into datapoint- and label entities and links between the two
	var nodes = []; // datapoints AND labels
	var links = [];
	// TODO: option to add lables only to outliers?
	data.forEach(function(d){
		nodes.push({x: me.x(d.x), y: me.y(d.y), t: "d", fixed: true});
		if(d.hasOwnProperty("label") && d.label!=""){
		  nodes.push({t: "l", label: d.label}); // TODO: set initial x,y for faster convergence?
		  links.push({source: nodes.length-2, target: nodes.length-1, weight: 1});
		}
	});
  
	this.svg = d3.select(htmlelement)
	.append("svg")
		.attr("class", "scplt")
		.attr("width", this.width + this.margin.left + this.margin.right)
		.attr("height", this.height + this.margin.top + this.margin.bottom)
	.append("g")
		.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	this.svg.append("g")
	  .attr("class", "x axis")
	  .attr("transform", "translate(0," + (this.height+20) + ")")
	  .call(this.xAxis)
	.append("text")
	  .attr("class", "label")
	  .attr("x", this.width)
	  .attr("y", -6)
	  .style("text-anchor", "end")
	  .text("x");
	  
	this.svg.append("g")
	  .attr("class", "y axis")
	  .attr("transform", "translate(-20,0)")
	  .call(this.yAxis)
	.append("text")
	  .attr("class", "label")
	  .attr("transform", "rotate(-90)")
	  .attr("y", 6)
	  .attr("dy", ".71em")
	  .style("text-anchor", "end")
	  .text("y");

	  this.force = d3.layout.force()
		.size([this.width, this.height])
		.nodes(nodes)
		.links(links)
	  // parameters critical for layout
		.gravity(0.15)
		.linkDistance(10)
		.linkStrength(20)
		.charge(-400);
		
	  var drag = this.force.drag()
		.on("dragstart", dragstart);
		
	  function dragstart(d) {
		d3.select(this).classed("fixed", d.fixed = true);
	  }

	  var link = this.svg.selectAll('.link')
		.data(links)
		.enter().append('line')
		.attr('class', 'link');

	  var node = this.svg.selectAll('.node')
		.data(nodes)
		.enter().append('g')
		.attr('class', 'node');

	  node.filter(function(d){
		  return d.t=="d";
		})
		.attr("transform", function(d){
		  return "translate(" + d.x + "," + d.y + ")";
		});
		
	  node.filter(function(d){
		  return d.t=="d";
		})
		.append("svg:circle")
		.attr("r", 5);

	  node.filter(function(d){
		  return d.t=="l";
		})
		.append("svg:text")
		.attr("display", "none")
		.text(function(d){
		  return d.label;
		})
		.call(drag);

	//TODO: tick / end
	this.force.on("tick", function() {

		node.attr("transform", function(d){
		  return "translate(" + d.x + "," + d.y + ")";
		});

		// store data point position in corresponding label to enable positioning
		// relative to data point position
		links.forEach(function(d){
		  //console.log(d);
		  d.target.datax = d.source.x;
		  d.target.datay = d.source.y;
		 
		  // conmpute angle and length of link for later transformations
		  var diffX = d.target.x - d.source.x;
		  var diffY = d.source.y - d.target.y;
		  d.vlength = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
		  d.alpha = Math.acos(diffX / d.vlength);
		  //console.log(d.target.label);
		  //console.log(d.alpha/0.0174532925);
		});

		//console.log(links);

		// Adjust label text placement.
		// Labels on the right of their target node are left-aligned, and labels on
		// the left of their target node are right-aligned; in between, we interpolate. 
		// Adapted from: http://bl.ocks.org/MoritzStefaner/1377729
		// TODO: ...
		node
		  .filter(function(d){
			return d.t=="l";
		  })
		  .each(function(d, i) {
			this.childNodes[0].setAttribute("display", 1);
					var b = this.childNodes[0].getBBox();
		
					var diffX = d.x - d.datax;
					var diffY = d.y - d.datay;

					var dist = Math.sqrt(diffX * diffX + diffY * diffY);

					var shiftX = b.width * (diffX - dist) / (dist * 2);
					shiftX = Math.max(-b.width, Math.min(0, shiftX));
					var shiftY = 5;
					this.childNodes[0].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
		
			});

		// place links so that they do not reach into objects goverened by the force layout
		// this is achieved by shortening the links.
		var distFromFEntity = 6; // distance from force entity in pixels  
		link.attr('x1', function(d) {
			return d.source.x + distFromFEntity * Math.cos(d.alpha);
		  })
		  .attr('y1', function(d) {
			return d.source.y + (d.source.y - d.target.y <0? 1:-1) * distFromFEntity * Math.sin(d.alpha);
		  })
		  .attr('x2', function(d) {
			return d.target.x - distFromFEntity * Math.cos(d.alpha);
		  })
		  .attr('y2', function(d) {
			return d.target.y - (d.source.y - d.target.y <0? 1:-1) * distFromFEntity * Math.sin(d.alpha);
		
		  });
	});

	this.force.start();

	// TODO: allow labels but not datapoints to be positioned via drag and drop
	// node.call(me.force.drag);
  
	return this;
  
 }
 
 
 
Scatterplot.prototype = {
  
	constructor: Scatterplot,
	
	/**
	* Set the x-axis label
	* */
	xlabel: function(t){
		this.svg.select(".x text.label")
		  .text(t);
		return this;
	},

	/**
	* Set the y-axis label
	* */
	ylabel: function(t){
		this.svg.select(".y text.label")
		  .text(t);
		return this;
	},

	/**
	* Restrict the numer of labels shown to the n most extreme datapoints, i.e.
	* the n datapoints with the largest eucliedean distance to all other
	* dataopints.
	* 
	* TODO:
	* - Efficient implementation, if neccessary a heuristic.
	* - Turn this into a function of the plot object, so that no data
	* parameter must be supplied.
	* 
	* */
	pruneLabels: function(data, n){
		// naive: all neighbours
		for(i=0; i<data.length; i++){
		  data[i].nndist=Infinity;
		  for(j=0; j<data.length; j++){
			if(i!=j){
			  d = Math.sqrt(Math.pow(data[i].x - data[j].x, 2) + Math.pow(data[i].y - data[j].y, 2) );
			  data[i].nndist = Math.min(data[i].nndist, d);
			}
		  }  
		}

		data.sort(function(l,r){ return  r.nndist - l.nndist;});

		for(i=n; i<data.length; i++){
		  delete data[i].label;
		}

		return data;
	}
  
}
