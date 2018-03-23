import makeMonthSvgs from './makeMonth';
import * as d3 from "d3";
import { swoopyDrag } from 'd3-swoopy-drag';

// helper funcs
const calcXDatePosition = (date, cellSize) => date.getDay() * cellSize;
const calcYDatePosition = (date, cellSize) => d3.timeWeek.count(d3.timeMonth(date), date) * cellSize;
const isSameDay = (dateToCheck, actualDate) => { return dateToCheck.getDate() === actualDate.getDate() && dateToCheck.getMonth() === actualDate.getMonth() && dateToCheck.getFullYear() === actualDate.getFullYear() };

// config variables
const cellSize = 80;
const container = document.querySelector('.months-container');
const december = document.querySelector('.december');
const november = document.querySelector('.november');

const counterSticky = document.querySelector('.counter-sticky');
const domElements = document.querySelectorAll('.cal-month'); // months need to be named correctly in the css classes, all lowercase
const genders = ['women', 'men'];
let size = 0;


makeMonthSvgs(domElements, cellSize);


// parse csv and do stuff
d3.csv(process.env.PATH + "/assets/data.csv", function(error, csv) {
    if (error) throw error;

    var totalCompaniesReporting = 0;
    //get number of weekdays in the year
    var totalWeekDays = getTotalWeekDays();

    var dates = [];

    // NB POSSIBLY REVIEW: HAD TO CHANGE THIS FROM < TO <= TO PREVENT IT FROM BREAKING WITH THE NEW DATASET
    for (var i = 0; i <= totalWeekDays; i++) {
        dates.push({
            womenPaidLess: 0,
            menPaidLess: 0,
            isWeekend: false
        })
    }

    //group company totals into days on a calendar
    csv.forEach(d => {
        let lower = Number(d.lower);
        let val = Number(d.value);
        totalCompaniesReporting += val;
        let day = totalWeekDays - Math.floor(Math.abs(lower) / 100 * totalWeekDays);

        if (lower === 0) {
            //skip
        } else if (lower > 0) {
            //women paid less
            dates[day].womenPaidLess += val;
        } else if (lower < 0 && lower > -2000) {
            //men paid less
            dates[day].menPaidLess += val;
        }
    })

    //add back the weekend days
    dates = addsWeekends(dates);

    //creates total aggregate
    var totalWomenCounter = 0;
    var totalMenCounter = 0;
    dates.forEach(function(d) {
        totalWomenCounter += d.womenPaidLess;
        totalMenCounter += d.menPaidLess;
        d.womenTotalPaidLess = totalWomenCounter;
        d.menTotalPaidLess = totalMenCounter;
    })
    var maxTotal = (totalWomenCounter > totalMenCounter) ? totalWomenCounter : totalMenCounter;
    var maxPct = maxTotal / totalCompaniesReporting;

    //creates percents of totals
    dates.forEach(function(d) {
        d.womenPctPaidLess = d.womenTotalPaidLess / totalCompaniesReporting;
        d.menPctPaidLess = d.menTotalPaidLess / totalCompaniesReporting;
    });

    // addData(dates, totalWomenCounter);
    addData(dates, domElements);

    initScroll(domElements, cellSize);

    /* Swoopy arrow stuff */

    const annotations = [
    {
      "dateX": 40,
      "dateY": -224,
      "path": "M-21,274C-21,315,-10,350,50,357",
      "text": "These are the companies that stop paying women one day earlier than men",
      "textOffset": [
        -34,
        261
      ]
    }
  ]

    const decemberSvg = d3.select(december)
      .select("svg")

    const swoopy = swoopyDrag()
      // .draggable(true)
      .x(d => d.dateX)
      .y(d => d.dateY)
      .on('drag', () => window.annotations = annotations)
      .annotations(annotations)

    const swoopySel = decemberSvg.select('.swoopy-arrow-group').call(swoopy);

    // arrow path
    swoopySel.selectAll('path')
    // .attr('class', d => `swoopy-path-${d.dateY}`)
    .attr('fill', 'none')
    .attr('stroke', '#000')
    .attr('stroke-opacity', 0)
    .attr('marker-end', 'url(#arrow)')

    // arrow tip
    decemberSvg
      .append('marker')
      .attr('id', 'arrow')
      .attr('fill-opacity', 0)
      .attr('viewBox', '-10 -10 20 20')
      .attr('markerWidth', 10)
      .attr('markerHeight', 20)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')

    swoopySel.selectAll('text')
      .attr('fill-opacity', 0)
});


// should this take an array of month elements?
const addData = (dates, domElements) => {

    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    domElements.forEach(domElement => {
        const monthAsInt = monthsArray.indexOf(domElement.classList[1]);
        const firstDayOfMonth = new Date(2018, monthAsInt, 1);
        const lastDayOfMonth = d3.timeDays(firstDayOfMonth, new Date(2018, monthAsInt + 1, 1)).slice(-1)[0];

        const firstDayIndex = dates.findIndex(d => isSameDay(d.date, firstDayOfMonth));
        const lastDayIndex = dates.findIndex(d => isSameDay(d.date, lastDayOfMonth));

        const filteredDates = dates.slice(firstDayIndex, lastDayIndex + 1);
        d3.select(domElement).selectAll(".day-group").data(filteredDates);

        d3.select(domElement).selectAll(".day-group")
            .selectAll("circle")
            .data(d => { return new Array(d['womenPaidLess']).fill(d) })
            .enter()
            .append("circle")
            .attr('class', 'dayData')
            .attr('cx', () => calcCirclePos())
            .attr('cy', () => calcCirclePos())
            .attr('r', 0)
            .attr('fill', '#ff7e00')
            .attr('opacity', 0)


        d3.select(domElement).selectAll(".day-group")
            .classed('weekend', function(d) {
                return d.isWeekend === true;
            })
    })
}

const calcCirclePos = () => {
    return cellSize / 24 + (cellSize - cellSize / 12) * Math.random();
}

const initScroll = (domElements, cellSize) => {
    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    
    domElements.forEach(element => {
        const monthAsInt = monthsArray.indexOf(element.classList[1]);
        
        window.addEventListener('scroll', () => {
            const rootElement = document.documentElement;
            const wTop = (window.pageYOffset || rootElement.scrollTop) - (rootElement.clientTop || 0);
            const wHeight = (window.innerHeight) / 2;
            const windowCenter = wTop + wHeight;

            d3.select(counterSticky)
            .transition()
            .duration(500)
            .delay(0)
            .tween('text', function() {
              const currentVal = this.textContent;
              const i = d3.interpolate(currentVal, size)
              return (t) => {
                d3.select(counterSticky).text(parseInt(i(t)));
              }
            });

            element.querySelectorAll(".week-group").forEach(group => {
                const groupRect = group.getBoundingClientRect();
                
                if (d3.select(group).attr("data-transitioned") !== "yes" && groupRect.top < 480) {
                    d3.select(group).attr("data-transitioned", "yes");
                    size += d3.select(group).selectAll(".dayData").size();

                    d3.select(group).selectAll(".dayData")
                        .transition()
                        .delay(0)
                        .ease(d3.easeExpOut)
                        .duration(1000)
                        .attr('cx', () => calcCirclePos())
                        .attr('cy', () => calcCirclePos())
                        .style("opacity", "1")
                        .attr('r', cellSize / 24)
                }

                if (d3.select(group).attr("data-transitioned") === "yes" && groupRect.top > 480) {
                  d3.select(group).attr("data-transitioned", "no");
                  size -= d3.select(group).selectAll(".dayData").size();
                }

                if (groupRect.top > 480) {
                  d3.select(group).selectAll(".dayData")
                        .transition()
                        .delay(0)
                        .ease(d3.easeExpOut)
                        .duration(2000)
                        .style("opacity", "1")
                        .attr('r', 0) 
                }
  
                d3.select(group).selectAll("text")
                    .transition()
                    .delay((d, i) => i * 100)
                    .ease(d3.easeExpOut)
                    .duration(2000)
                    .style("opacity", d => groupRect.top < 500 ? "1" : "0");
            });

            /* Swoopy arrows stuff */
            const elemRect = element.getBoundingClientRect();
            const arrows = d3.select(element).select('.swoopy-arrow-group');

            arrows.selectAll('path')
                .transition()
                .delay(0)
                .ease(d3.easeExpOut)
                .duration(2000)
                .attr('stroke-opacity', elemRect.top < 396 ? 1 : 0)
                .attr('marker-end', 'url(#arrow)')
                
            arrows.selectAll('text')
                .transition()
                .delay(0)
                .ease(d3.easeExpOut)
                .duration(2000)
                .attr('fill-opacity', elemRect.top < 396 ? 1 : 0)

            d3.select(element).selectAll('marker')
                .transition()
                .delay(0)
                .ease(d3.easeExpOut)
                .duration(2000)
                .attr('fill-opacity', elemRect.top < 396 ? 1 : 0)

            /* Highilighting parts of calendar (not working) */
            // d3.select('.gv-w').select("rect[id='2018-01-20']")
            //   .attr('fill', d => console.log(this))
            //   .attr('fill-opacity', 1)
        })
    })
}

const getTotalWeekDays = () => {
    var count = 365;
    var countWeekDays = 365;
    for (var day = 1; day < count + 1; day++) {
        //days in month
        var curday = new Date(2018, 0, day);
        if (curday.getDay() == 6 || curday.getDay() == 0) {

            countWeekDays--;
        }
    }
    return countWeekDays;
}

const addsWeekends = (dates) => {
    var count = 365;
    for (var day = 0; day < count; day++) {
        //days in month
        var curday = new Date(2018, 0, day + 1);
        if (curday.getDay() == 6 || curday.getDay() == 0) {
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