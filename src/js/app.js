import makeCalendar from './makeCalendar';
import * as d3 from "d3"

var genders = ['women', 'men'];
var womenEl = document.querySelector('.gv-w')
var menEl = document.querySelector('.gv-m')

const cellSize = 30;

makeCalendar(womenEl);
makeCalendar(menEl);

// end dom creation

d3.csv(process.env.PATH + "/assets/data.csv", function(error, csv) {
  if (error) throw error;

  var totalCompaniesReporting = 0;
  //get number of weekdays in the year
  var totalWeekDays = getTotalWeekDays();

  var dates = [];
  for(var i = 0; i < totalWeekDays; i ++){
    dates.push({
      womenPaidLess: 0,
      menPaidLess: 0,
      isWeekend: false
    })
  }

  //group company totals into days on a calendar
  csv.forEach( d =>{
    //console.log(d)
    let lower = Number(d.lower);
    let val = Number(d.value);
    totalCompaniesReporting += val;
    var day = totalWeekDays-Math.floor( Math.abs(lower)/100 * totalWeekDays);

    if(lower == 0){
      //skip
    } else if(lower > 0){
      //women paid less
      dates[day].womenPaidLess += val;
    } else if(lower < 0 && lower != -2000 ){
      //men paid less
      //console.log(day)
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
  initScroll(dates);
});

function addData(dates){

  genders.forEach(g => {
    d3.select('.gv-' + g.charAt(0) ).selectAll(".dayData").data(dates);
    d3.select('.gv-' + g.charAt(0) ).selectAll(".day").data(dates);
    d3.select('.gv-' + g.charAt(0) ).selectAll(".day")
    .classed('weekend', function(d, i){
      return (d.isWeekend) ? true : false;
    })
  })
}

function initScroll(){

  var r = womenEl.getBoundingClientRect();
  

  window.addEventListener('scroll', function(){

      var centroid = r.top + r.height/2;
      var wTop = (window.pageYOffset || document.documentElement.scrollTop)  - (document.documentElement.clientTop || 0),
        wHeight = window.innerHeight/2;
      var windowCenter = wTop + wHeight;

      genders.forEach(gender => {
        d3.select('.gv-' + gender.charAt(0) ).selectAll(".dayData")
        .transition()
        .delay(0)
        .ease(d3.easeExpOut)
        .duration(4000)
          .attr('fill', d => gender === 'women' ? '#ff7e00' : '#2aadbc')
          .attr('y', d => (d3.timeWeek.count(d3.timeYear(d.date), d.date) * cellSize) - (d[`${gender}PaidLess`] / 100 * cellSize - cellSize))
          .attr('height', d => d[`${gender}PaidLess`] / 100 * cellSize)
          .attr('width', d => d[`${gender}PaidLess`] / 100 * cellSize)

        d3.select('.gv-' + gender.charAt(0)).selectAll(".day")
          .transition()
          .delay(0)
          .ease(d3.easeExpOut)
          .duration(4000)
          .attr('fill', d => d[`${gender}PaidLess`] > 0 && gender === 'women' ? '#ff7e00' : 'white')
          .attr('fill-opacity', 0.3)
          // .attr('y', d => (d3.timeWeek.count(d3.timeYear(d.date), d.date) * cellSize))
          .attr('height', cellSize)
          .attr('width', cellSize)

        });



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
