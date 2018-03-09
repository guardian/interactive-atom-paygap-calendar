import * as d3 from "d3";

export default function makeCalendar(el){





  //create dom elements
  var width = 210,
      height = 2123,
      cellSize = 30; // cell size

  var percent = d3.format(".1%"),
      format = d3.timeFormat("%Y-%m-%d");

  var color = d3.scaleQuantize()
      .domain([-.05, .05])
      .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

  var svg = d3.select(el).selectAll("svg")
      .data(d3.range(2018, 2019))
    .enter().append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "RdYlGn")
    .append("g")
    //   .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

  svg.append("text")
      .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
      .style("text-anchor", "middle")
      .text(function(d) { return d; });

  var rect = svg.selectAll(".day")
      .data(function(d) { return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter()
      .append("rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr('fill', '#fff')
      .attr("y", function(d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize; })
      .attr("x", function(d) { return d.getDay() * cellSize; })
      .datum(format);

  var dataSquares = svg.selectAll(".dayData")
      .data(function(d) { return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter()
      .append("rect")
      .attr("class", "dayData")
      .attr("width", 0)
      .attr("height", 0)
      .attr("y", function(d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize + cellSize; })
      .attr("x", function (d) { return d.getDay() * cellSize; })
    //   .attr("r", 0)

  rect.append("title")
      .text(function(d) { return d; });

  svg.selectAll(".month")
      .data(function(d) { return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter().append("path")
      .attr("class", "month")
      .attr("d", monthPath);



  function monthPath(t0) {

    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0);
    var d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0);
    var d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);

    // console.log(t0, t1, d0, d1)
    return "M" + d0 * cellSize + "," + w0 * cellSize
        + "H" + 7 * cellSize + "V" + w0 * cellSize
        + "H" + 7 * cellSize + "V" + w1 * cellSize
        + "H" + (d1 + 1) * cellSize + "V" + w1 * cellSize
        + "H" + (d1 + 1) * cellSize + "V" + (w1 + 1) * cellSize
        + "H" + 0 + "V" + (w1 + 1) * cellSize
        + "H" + 0 + "V" + (w0 + 1) * cellSize
        + "H" + (d0 ) * cellSize + "V" + w0 * cellSize
        + 'Z';
        // + "H" + w0 * cellSize + "V" + 7 * cellSize
        // + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
        // + "H" + (w1 + 1) * cellSize + "V" + 0
        // + "H" + (w0 + 1) * cellSize + "Z";
  }


}
