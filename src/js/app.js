import * as d3 from "d3"

var width = 960,
    height = 136,
    cellSize = 17; // cell size

var percent = d3.format(".1%"),
    format = d3.timeFormat("%Y-%m-%d");

var color = d3.scaleQuantize()
    .domain([-.05, .05])
    .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

var svg = d3.select("body").selectAll("svg")
    .data(d3.range(2018, 2019))
  .enter().append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "RdYlGn")
  .append("g")
    .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

svg.append("text")
    .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
    .style("text-anchor", "middle")
    .text(function(d) { return d; });

var rect = svg.selectAll(".day")
    .data(function(d) { return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
  .enter().append("rect")
    .attr("class", "day")
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("x", function(d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize; })
    .attr("y", function(d) { return d.getDay() * cellSize; })
    .datum(format);

rect.append("title")
    .text(function(d) { return d; });

svg.selectAll(".month")
    .data(function(d) { return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
  .enter().append("path")
    .attr("class", "month")
    .attr("d", monthPath);

d3.csv(process.env.PATH + "/assets/data.csv", function(error, csv) {
  if (error) throw error;

  console.log(csv)

  //get number of weekdays
  var totalWeekDays = getTotalWeekDays();

  var dates = [];
  for(var i = 0; i < totalWeekDays; i ++){
    dates.push({
      value: 0,
      total: 0,
      isWeekend: false
    })
  }

  csv.forEach( d =>{
    //console.log(d)
    let lower = Number(d.lower);
    let val = Number(d.value);
    if(lower > 0){
      var day = totalWeekDays-Math.floor(lower/100 * totalWeekDays);
      //console.log(lower)
      dates[day].value += val;
    }
  })

  dates = addsWeekends(dates);



  var totalCounter = 0;
  dates.forEach(function(d){
    totalCounter += d.value;
    d.total = totalCounter;
  })
  console.log(dates)

  rect.classed('weekend', function(d, i){
    return (dates[i].isWeekend) ? true : false;
  })
  .classed('hasValues', function(d, i){
    return (dates[i].value > 0) ? true : false;
  })
  rect.classed('fill-opacity', function(d, i){

  })

});

function getTotalWeekDays(){
  var count = 365;
  var countWeekDays = 365;
  for (var day=1; day<count+1; day++) {
    //days in month

        var curday = new Date(2018,0,day);
        //console.log(curday)
        if(curday.getDay() == 6 || curday.getDay() == 0){

          countWeekDays --;
        }
        //console.log(day)
  }
  console.log('total weekdays',countWeekDays)
  return countWeekDays;
}


function addsWeekends(dates){
  var count = 365;
  for (var day=0; day<count; day++) {
    //days in month

        var curday = new Date(2018,0,day+1);
        //console.log(curday)
        if(curday.getDay() == 6 || curday.getDay() == 0){

          dates.splice(day, 0, {
            value: 0,
            total: 0,
            isWeekend: true
          });
        }
        dates[day].date = curday;

  }
  return dates;
}

function monthPath(t0) {
  var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0);
  var d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0);
  var d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
  return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
      + "H" + w0 * cellSize + "V" + 7 * cellSize
      + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
      + "H" + (w1 + 1) * cellSize + "V" + 0
      + "H" + (w0 + 1) * cellSize + "Z";
}
