/**
 * Time series graph
 *
 * Requires: D3 v4
 *
 **/

/*
TODO:
  handling of multiple event series
  handling of multiple series
  improved transitions
*/
function SeriesGraph(htmlelement){
	
  var me = this;

  this.htmlelement = htmlelement;
  this.y1data = [];
  this.y2data = [];
  this.eventdata = [];
  this.dateidx = {};
  this.datelist = [];
  this.y1unit = "";
  this.y2unit = "";
  this.transduration = 400;
  this.formatValue = d3.format(",.2f");
  this.formatDate = d3.timeFormat("%b %d, %a %H:%M");
  this.margin = {top: 20, right: 80, bottom: 30, left: 80};
  this.width = 640; // default width, actual width is determined by parent html element
  this.height = 300 - this.margin.top - this.margin.bottom;
  this.yheight = 220;
  this.eheight = 266;

  this.x = d3.scaleTime();

  this.y1 = d3.scaleLinear();
      
  this.y2 = d3.scaleLinear();

  this.xAxis = d3.axisBottom(this.x);

  this.y1Axis = d3.axisLeft(this.y1);

  this.y2Axis = d3.axisRight(this.y2);	

  this.line = d3.line()
    .x(function(d) { return me.x(d.date); })
    .y(function(d) { return me.y1(d.value); });

  this.line2 = d3.line()
    .x(function(d) { return me.x(d.date); })
    .y(function(d) { return me.y2(d.value); });
}


SeriesGraph.prototype = {

  /**
  * Add a new series graph to an existing HTML-element
  */ 	
  constructor: SeriesGraph,

  /**
  * Add time series to primary axis
  *
  * The series parameter must be an array containing objects with a "date" and
  * a "value" property.
  */ 
  addY1Series: function(series){
    this.y1data.push(series)
  },

  /**
  * Add time series to secondary axis
  */ 
  addY2Series: function(series){
    this.y2data.push(series)
  },

  /**
  * Add event series to time axis
  */ 
  addEventSeries: function(series){
    //this.eventdata.push(series)
    if(this.eventdata.length>0){
      console.warn("WARNING: overriding event data, multiple event series are not implemented");
    }
    this.eventdata = series;
  },

  /**
  * Remove all time series and event data sets
  */ 
  removeAllSeries: function(series){
    this.y1data = [];
    this.y2data = [];
    this.eventdata = [];
  },

  /**
  * Get or set unit label for primary y axis
  */		
  y1Unit: function(_){
    if (!arguments.length) return this.y1unit;
    this.y1unit = _;
    //this.svg.select(".sg-y-series-title").text(_);
  },

  /**
  * Get or set unit label for secondary y axis
  */	
  y2Unit: function(_){
    if (!arguments.length) return this.y2unit;
    this.y2unit = _;
    //this.svg.select(".sg-y2-series-title").text(_);
  },

  /**
  * Get or set time axis label formatting
  */	
  timeFormat: function(_){
    if (!arguments.length) return this.formatDate;
    this.formatDate = _;
  },

  /**
  * Render the graph
  */  
  draw: function(){
		
    var me = this;

    this.width = d3.select(this.htmlelement).style("width").replace("px", "") - this.margin.left - this.margin.right;

    // populate date index and set axis domains
    this.dateidx = {};
    this.y1.domain(d3.extent(me.y1data[0], function(d) { return d.value; }));
    for(i=0; i< this.y1data.length; i++){
      this.y1data[i].forEach(function(k){
        t = k.date.getTime();
        if(me.dateidx[t] == undefined){
	        me.dateidx[t] = {"date":k.date, "y1v":[], "y2v":[], "events":[]};
        }
        me.dateidx[t].y1v.push({"index":i, "value":k.value});

        if(me.y1.domain()[0] > k.value) me.y1.domain([k.value, me.y1.domain()[1]]);
        if(me.y1.domain()[1] < k.value) me.y1.domain([me.y1.domain()[0], k.value]);
      });
    }
    this.eventdata.forEach(function(k){
      t= k.date.getTime();
      if(me.dateidx[t] == undefined){
        me.dateidx[t] = {"date":k.date, "y1v":[], "y2v":[], "events":[]};
      }
      me.dateidx[t].events.push(k.value);
    });
    if(this.y2data.length > 0){
      this.y2.domain(d3.extent(me.y2data[0], function(d) { return d.value; }));
      for(i=0; i<this.y2data.length; i++){
      	this.y2data[i].forEach(function(k){
      		t = k.date.getTime();
          if(me.dateidx[t] == undefined){
            me.dateidx[t]= {"date":k.date, "y1v":[], "y2v":[], "events":[]};
      		}
          me.dateidx[t].y2v.push({"index":i, "value":k.value});

          if(me.y2.domain()[0] > k.value) me.y2.domain([k.value, me.y2.domain()[1]]);
          if(me.y2.domain()[1] < k.value) me.y2.domain([me.y2.domain()[0], k.value]);
      	});
      }
    }
    this.datelist = [];
    for (var p in me.dateidx) { if (me.dateidx.hasOwnProperty(p)) { me.datelist.push(me.dateidx[p].date);}}
    this.datelist.sort(function(a,b){return a.getTime()-b.getTime();});

    this.x.domain([me.datelist[0], me.datelist[me.datelist.length-1]]);

    this.width = d3.select(this.htmlelement).style("width").replace("px", "") - this.margin.left - this.margin.right; // default width?

    // update scales
    this.x.range([0, this.width]);
    this.y1.range([this.yheight, 0]);
    this.y2.range([this.yheight, 0]);

    // create skeletal elements if non-existent
    var g;
    if(this.svg == undefined){

      this.svg = d3.select(this.htmlelement)
        .append("div")
          .attr("class","sgraph-container")
        .append("svg")
          .attr("class", "sgraph");

      var g = this.svg.append("g");

      //TODO: handle addition and removal of lines
      // all y1 series
      for(var i=0; i<this.y1data.length; i++){
        g.append("path")
          .attr("class", "sg-y1line line"+i)
          .attr("d", this.line(this.y1data[i]));
      }

      // all y2 series
      for(var i=0; i<this.y2data.length; i++){
        g.append("path")
          .attr("class", "sg-y2line line"+i)
          .attr("d", this.line2(this.y2data[i]));
      }

      // all event series
      g.append("g")
        .attr("class", "sg-event");

      g.append("g")
        .attr("class", "x sg-axis")
        .attr("transform", "translate(0," + (this.yheight+10) + ")");

      g.append("g")
        .attr("class", "y1 sg-axis")
        .attr("transform", "translate(-10,0)")
      .append("text")
	      .attr("class", "sg-y1-axis-title")
        .attr("y", -10)
        .style("text-anchor", "start");

	    if(this.y2data.length>0){
	    	g.append("g")
	        .attr("class", "y2 sg-axis")
	        .attr("transform", "translate("+(this.width+10)+",0)")
	      .append("text")
	      	.attr("class", "sg-y2-axis-title")
	        .attr("y", -10)
	        .style("text-anchor", "end");
	    }


    }

    this.svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    g = this.svg.select("g");

    // create/destroy y2 axis
    // TODO

    g.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // update line paths
    //TODO: handle addition and removal of lines
    // all y1 series
    for(var i=0; i<this.y1data.length; i++){
      g.select(".sg-y1line.line"+i)
        .transition()
          .duration(this.transduration)
        .attr("d", this.line(this.y1data[i]));
    }

    // all y2 series
    for(var i=0; i<this.y2data.length; i++){
      g.select(".sg-y2line.line"+i)
        .transition()
          .duration(this.transduration)
        .attr("d", this.line2(this.y2data[i]));
    }

    // event series
    var sgevents = g.select(".sg-event").selectAll("circle")
      .data(me.eventdata);

    sgevents
      .transition()
        .duration(this.transduration)
        .attr("cx", function(d) { return me.x(d.date); })
        .attr("cy", me.eheight);

    sgevents.enter().append("circle")
		    .attr("r", 5)
		    .attr("cx", function(d) { return me.x(d.date); })
		    .attr("cy", me.eheight)
      .transition()
        .duration(this.transduration);

    sgevents.exit()
      .transition()
        .duration(this.transduration)
        .style("fill-opacity", 1e-6)
        .remove();

    // update axes
    g.select(".x.sg-axis")
		  .transition()
        .duration(this.transduration)
      .call(this.xAxis);

    g.select(".y1.sg-axis")
		  .transition()
        .duration(this.transduration)
      .call(this.y1Axis)
      .select(".sg-y1-axis-title")
        .text(this.y1unit);

    g.select(".y2.sg-axis")
		  .transition()
        .duration(this.transduration)
      .call(this.y2Axis)
      .select(".sg-y2-axis-title")
        .text(this.y2unit);

    // focus
    g.selectAll(".sg-focus").remove();

    var focus = g.append("g")
      .attr("class", "sg-focus")
      .style("display", "none");
	      
    focus.append("line")
      .attr("x1", 0)
      .attr("y1", 230)
      .attr("x2", 0)
      .attr("y2", 235);

    var tslabel = focus.append("g");

    tslabel.append("rect")
      .attr("y", 242)
      .style("fill","white");
		
    tslabel.append("text")
      .attr("class", "sg-date-label")
      .attr("y", 246)
      .style("text-anchor", "middle");
	      
    var edatapoint = focus.append("g")
      .attr("class","sg-edatapoint");

    edatapoint.append("circle")
      .attr("r", 4.5);
	
    g.append("rect")
      .attr("class", "sg-overlay")
      .attr("width", this.width)
      .attr("height", this.height+60)
      .on("mouseover", function() { focus.style("display", null); })
      .on("mouseout", function() { focus.style("display", "none"); })
      .on("mousemove", mousemove);
	      
    d3.select(this.htmlelement).append("div")
      .attr("id", "sg-event-label")
      .style("position", "absolute")
      .style("left", "0")
      .style("top", "0");    

    this.bisectDate = d3.bisector(function(d) { return d; }).left;
	  
    function mousemove() {
      var x0 = me.x.invert(d3.mouse(this)[0]);
      var i = me.bisectDate(me.datelist, x0, 1);
      var d0 = me.datelist[i - 1];
      var d1 = me.datelist[i];
      var d = x0 - d0 > d1 - x0 ? d1 : d0;

      if(d == me.lastdp){
        return;
      }
      me.lastdp = d;

    focus.attr("transform", "translate(" + me.x(d) + ",0)");

    focus.selectAll("g.sg-datapoint").remove();

    focus.select(".sg-date-label")
      .text(me.formatDate(d));

      var bbox = focus.select(".sg-date-label").node().getBBox();

      focus.select("rect")
        .attr("y", bbox.y-2)
        .attr("x", -(bbox.width/2+8))
        .attr("width", bbox.width +16)
        .attr("height", bbox.height +4);

      var tmpdps = me.dateidx[d.getTime()];
	    	
      if(tmpdps.y1v != undefined){
        tmpdps.y1v.forEach(function(d){

          var y1datapoint = focus.append("g")
            .attr("class","sg-datapoint")
            .attr("transform", "translate(0," + me.y1(d.value) + ")");

          y1datapoint.append("circle")
            .attr("r", 4.5);

          y1datapoint.append("rect")
            .style("fill","white")
            .style("opacity", 0.9);

          y1datapoint.append("text")
            .attr("x", 10)
            .style("text-anchor", "start")
            .attr("dy", ".35em")
            .text(me.formatValue(d.value));

          var bbox = y1datapoint.select("text").node().getBBox();

          y1datapoint.select("rect")
            .attr("x", 8)
            .attr("y", -bbox.height/2 -1)
            .attr("width", bbox.width +4)
            .attr("height", bbox.height +2);

          y1datapoint.append("line")
            .attr("x1", -me.x(tmpdps.date) -10)
            .attr("y1", 0)
            .attr("x2", -me.x(tmpdps.date) -4)
            .attr("y2", 0);

        });
      }

      if(tmpdps.y2v != undefined){
        tmpdps.y2v.forEach(function(d){

          var y2datapoint = focus.append("g")
            .attr("class","sg-datapoint")
            .attr("transform", "translate(0," + me.y2(d.value) + ")");    

          y2datapoint.append("circle")
            .attr("r", 4.5);

          y2datapoint.append("rect")
            .style("fill","white")
            .style("opacity", 0.9);

          y2datapoint.append("text")
            .attr("x", 10)
            .style("text-anchor", "start")
            .attr("dy", ".35em")
            .text(me.formatValue(d.value));

          var bbox = y2datapoint.select("text").node().getBBox();

          y2datapoint.select("rect")
            .attr("x", 8)
            .attr("y", -bbox.height/2 -1)
            .attr("width", bbox.width +4)
            .attr("height", bbox.height +2);

          y2datapoint.append("line")
            .attr("x1", me.width -me.x(tmpdps.date) +10)
            .attr("y1", 0)
            .attr("x2", me.width -me.x(tmpdps.date) +4)
            .attr("y2", 0);

      	});
      }

      var xtmp = me.x(d)+me.margin.left;

      focus.select(".sg-edatapoint circle")
        .style("display", function(){
	        return (tmpdps.events.length>0)? null:"none";
        });

      focus.select(".sg-edatapoint")
        .attr("transform", "translate(0," + me.eheight + ")");
	   
      if(tmpdps.events.length > 0){
        me.removeEventLabels();
        etmp = [];
        tmpdps.events.forEach(function(k){etmp.push({"date":d,"value":k})});

        me.addEventLabels(etmp);
      }
	
    }

    g.on("mouseout",function(){
      me.removeEventLabels();
      me.lastdp = undefined;
    });

  },

  /**
  * Render event series labes
  *
  * The parameter must be an array containing objects with a "date" and
  * a "value" property.
  */
  addEventLabels: function(d){

    if(d.length == 0){
      return;
    }

    var me = this;

    var g = this.svg.select("g");
		
    // focus circles
    d.forEach(function(p){
      g.append("circle")
        .attr("class", "sg-event-focus")
        .attr("cx", function(d) { return me.x(p.date); })
        .attr("cy", me.eheight)
        .attr("r", 4.5);
    });

    // label
    var xtmp = Math.round(this.x(d[0].date) + me.margin.left);

    var l = d3.select(me.htmlelement + " > .sgraph-container").append("div")
      .style("position", "absolute")
      .style("top", (me.eheight+me.margin.top - 6)+"px");

    // display left from datapoint
    if(xtmp > me.width/2){
      l.attr("class", "sg-event-label-left")
      .style("left", undefined)
      .style("right", (me.width+me.margin.left+me.margin.right-xtmp+12)+"px");
    }
    // display right from datapoint
    else{
	    l.attr("class", "sg-event-label-right")
		    .style("right", undefined)	
		    .style("left", (xtmp+12)+"px");
    }
    l.html(function(){
      return d.reduce(function(x, obj){return x+"<p>"+obj.value+"</p>"}, "");
    });

  },
	
  removeEventLabels: function(){
    d3.select(this.htmlelement).selectAll(".sg-event-label-left, .sg-event-label-right, .sg-event-focus").remove();
  }

}
