import makeCalendar from './makeCalendar';
import * as d3 from "d3"


var womenEl = document.querySelector('.gv-w')
var menEl = document.querySelector('.gv-m')

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
    console.log(d.wo)
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
  console.log( 'totalWomenCos', totalWomenCounter)
  console.log( 'totalMenCos', totalMenCounter)
  addData(dates, totalWomenCounter);
});

function addData(dates, totalWomenCounter){

  var genders = ['women', 'men'];

  var color = d3.scaleThreshold()
    .domain([0, 5, 25, 125, 625, 3125] )
    .range([0, .1 ,.2, .3, .4, .5]);

  genders.forEach(g => {

    d3.select('.gv-' + g.charAt(0) ).selectAll(".day")
    .classed('weekend', function(d, i){
      return (dates[i].isWeekend) ? true : false;
    })
    .classed('hasValues', function(d, i){
      return (dates[i][g + 'PaidLess'] > 0 && !dates[i].isWeekend) ? true : false;
    })
    .classed('dataPaidLess', function(d, i){
      return (dates[i][ g + 'TotalPaidLess'] > 0 && !dates[i].isWeekend) ? true : false;
    })
    .style('fill-opacity', function(d, i){
      if(!dates[i].isWeekend){
        return (dates[i][ g + 'TotalPaidLess'] > 0) ? color(dates[i][ g + 'TotalPaidLess']) : 0;

      }
      return '';
    })


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
