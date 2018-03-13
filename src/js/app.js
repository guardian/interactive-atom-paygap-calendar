import makeCalendar from './makeCalendar';
import * as d3 from "d3";
import { swoopyDrag } from 'd3-swoopy-drag';

const genders = ['women', 'men'];
const womenEl = document.querySelector('.gv-w')

const calendarWomen = document.querySelector('.RdYlGn');
const container = document.querySelector('.gv-container');
 
const calcXDatePosition = (date, cellSize) => date.getDay() * cellSize;
const calcYDatePosition = (date, cellSize) => d3.timeWeek.count(d3.timeYear(date), date) * cellSize;


const cellSize = 60;

makeCalendar(womenEl);

// end dom creation

d3.csv(process.env.PATH + "/assets/data.csv", function(error, csv) {
  if (error) throw error;

  var totalCompaniesReporting = 0;
  //get number of weekdays in the year
  var totalWeekDays = getTotalWeekDays();
  
  var dates = [];

  // NB POSSIBLY REVIEW: HAD TO CHANGE THIS FROM < TO <= TO PREVENT IT FROM BREAKING WITH THE NEW DATASET
  for(var i = 0; i <= totalWeekDays; i++){
    dates.push({
      womenPaidLess: 0,
      menPaidLess: 0,
      isWeekend: false
    })
  }

  //group company totals into days on a calendar
  csv.forEach( d => {
    let lower = Number(d.lower);
    let val = Number(d.value);
    totalCompaniesReporting += val;
    let day = totalWeekDays - Math.floor( Math.abs(lower)/100 * totalWeekDays);
 
    if (lower === 0){
      //skip
    } else if (lower > 0){
      //women paid less
      dates[day].womenPaidLess += val;
    } else if (lower < 0 && lower > -2000){
      //men paid less
      dates[day].menPaidLess += val;
    }
  })

  //add back the weekend days
  dates = addsWeekends(dates);

  //creates total aggregate
  var totalWomenCounter = 0;
  var totalMenCounter = 0;
  dates.forEach(function(d){
    totalWomenCounter += d.womenPaidLess;
    totalMenCounter += d.menPaidLess;
    d.womenTotalPaidLess = totalWomenCounter;
    d.menTotalPaidLess = totalMenCounter;
  })
  var maxTotal = (totalWomenCounter > totalMenCounter) ? totalWomenCounter: totalMenCounter;
  var maxPct = maxTotal / totalCompaniesReporting;

  //creates percents of totals
  dates.forEach(function(d){
    d.womenPctPaidLess = d.womenTotalPaidLess / totalCompaniesReporting;
    d.menPctPaidLess = d.menTotalPaidLess / totalCompaniesReporting;
  });
  // console.log( 'totalWomenCos', totalWomenCounter)
  // console.log( 'totalMenCos', totalMenCounter)
  addData(dates, totalWomenCounter);


  const earliestDay = dates.find(obj => obj.womenPaidLess > 0);

  const annotations = [
    {
      "dateX": 90,
      "dateY": 600,
      "path": "M-21,519C-21,589,16,639,83,653",
      "text": "The earliest date at which women would start working for free",
      "textOffset": [
        -72,
        508
      ]
    }
  ]

  const womenSvg = d3.select(container)
    .select("svg")
    .style("overflow", "visible")

    womenSvg
    .append('marker')
    .attr('id', 'arrow')
    .attr('fill-opacity', 0)
    .attr('viewBox', '-10 -10 20 20')
    .attr('markerWidth', 10)
    .attr('markerHeight', 20)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')

  const swoopy = swoopyDrag()
    // .draggable(true)
    .x(d => d.dateX)
    .y(d => d.dateY)
    .on('drag', () => window.annotations = annotations)
    .annotations(annotations)


  const swoopySel = womenSvg.append('g')
    .classed('swoopy-arrow-group', true)
    .call(swoopy);

  swoopySel.selectAll('path')
  .attr('fill', 'none')
  .attr('stroke', '#000')
  .attr('stroke-opacity', 0)
  .attr('marker-end', 'url(#arrow)')

  swoopySel.selectAll('text')
    .attr('fill-opacity', 0)

  initScroll(dates);
});

function addData(dates){
    d3.select('.gv-w').selectAll(".dayData").data(dates);
    d3.select('.gv-w').selectAll(".day").data(dates);
    d3.select('.gv-w').selectAll(".day")
    .classed('weekend', function(d, i){
      return (d.isWeekend) ? true : false;
    })
}

function initScroll() {

  const womenRect = womenEl.getBoundingClientRect();

  window.addEventListener('scroll', () => {
    const centroid = womenRect.top + womenRect.height / 2;
      const wTop = (window.pageYOffset || document.documentElement.scrollTop)  - (document.documentElement.clientTop || 0)
      const wHeight = window.innerHeight / 2;
      const windowCenter = wTop + wHeight;
      const d3Container = d3.select(container);
      const arrows = d3Container.selectAll('.swoopy-arrow-group');

        d3.select('.gv-w').selectAll(".dayData")
        .transition()
        .delay(0)
        .ease(d3.easeExpOut)
        .duration(2500)
          .attr('fill', '#ff7e00')
          .attr('y', d => calcYDatePosition(d.date, cellSize) - (d['womenPaidLess'] / 100 * cellSize - cellSize))
          .attr('height', d => {
            if (d['womenPaidLess'] > 0 && womenRect.top + calcYDatePosition(d.date, cellSize) - (d['womenPaidLess'] / 100 * cellSize + cellSize) < windowCenter) {
              return d['womenPaidLess'] / 100 * cellSize;
            } else {
              return 0;
            }
          })
          .attr('width', d => {
            if (womenRect.top + calcYDatePosition(d.date, cellSize) - (d['womenPaidLess'] / 100 * cellSize + cellSize) < windowCenter) {
              return d['womenPaidLess'] / 100 * cellSize;
            } else {
              return 0;
            }
          })

        d3.select('.gv-w').selectAll(".day")
          .transition()
          .delay(0)
          .ease(d3.easeExpOut)
          .duration(2000)
          .attr('fill', d => d['womenPaidLess'] > 0 && womenRect.top + calcYDatePosition(d.date, cellSize) - (d['womenPaidLess'] / 100 * cellSize + cellSize) < windowCenter ? '#ff7e00': '#fff')
          .attr('fill-opacity', 0.3)
          .attr('height', cellSize)
          .attr('width', cellSize)
    

          /* Swoopy arrows stuff */
          arrows.selectAll('path')
            .transition()
            .delay(0)
            .ease(d3.easeExpOut)
            .duration(4000)
            .attr('stroke-opacity', d => womenRect.top + 508 < windowCenter ? 1 : 0)
            .attr('marker-end', 'url(#arrow)')
          
          arrows.selectAll('text')
            .transition()
            .delay(0)
            .ease(d3.easeExpOut)
            .duration(4000)
            .attr('fill-opacity', 1)

          d3Container.selectAll('marker')
            .transition()
            .delay(0)
            .ease(d3.easeExpOut)
            .duration(4000)
            .attr('fill-opacity', 1)

          /* Highilighting parts of calendar (not working) */
          // d3.select('.gv-w').select("rect[id='2018-01-20']")
          //   .attr('fill', d => console.log(this))
          //   .attr('fill-opacity', 1)

  })
}



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
  //console.log('total weekdays',countWeekDays)
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
            womenPaidLess: 0,
            menPaidLess: 0,
            isWeekend: true
          });
        }
        dates[day].date = curday;

  }
  return dates;
}
