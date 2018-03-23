import makeMonthSvgs from './makeMonth';
import * as d3 from "d3";
import { swoopyDrag } from 'd3-swoopy-drag';

// helper funcs
const calcXDatePosition = (date, cellSize) => date.getDay() * cellSize;
const calcYDatePosition = (date, cellSize) => d3.timeWeek.count(d3.timeMonth(date), date) * cellSize;
const isSameDay = (dateToCheck, actualDate) => { return dateToCheck.getDate() === actualDate.getDate() && dateToCheck.getMonth() === actualDate.getMonth() && dateToCheck.getFullYear() === actualDate.getFullYear() };

// config variables
const cellSize = 80;
const cellSizeMargin = 70;
const container = document.querySelector('.months-container');
const counterSticky = document.querySelector('.counter-sticky');
const domElements = document.querySelectorAll('.cal-month'); // months need to be named correctly in the css classes, all lowercase
const genders = ['women', 'men'];
let size = 0;
let lastScroll = null;


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

    function checkScroll() {
        if (lastScroll !== window.pageYOffset) {
            onScroll(domElements, cellSize);
            lastScroll = window.pageYOffset;
        }
        window.requestAnimationFrame(() => {
            checkScroll();
        });
    }

    // initScroll(domElements, cellSize);
    checkScroll();

    /* Swoopy arrow stuff */

    // const earliestDay = dates.find(obj => obj.womenPaidLess > 0);

    // const annotations = [
    //   {
    //     "dateX": 90,
    //     "dateY": 600,
    //     "path": "M-21,519C-21,589,16,639,83,653",
    //     "text": "The earliest date at which women would start working for free",
    //     "textOffset": [
    //       -72,
    //       508
    //     ]
    //   }
    // ]

    // const womenSvg = d3.select(container)
    //   .select("svg")
    //   .style("overflow", "visible")

    //   womenSvg
    //   .append('marker')
    //   .attr('id', 'arrow')
    //   .attr('fill-opacity', 0)
    //   .attr('viewBox', '-10 -10 20 20')
    //   .attr('markerWidth', 10)
    //   .attr('markerHeight', 20)
    //   .attr('orient', 'auto')
    //   .append('path')
    //   .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')

    // const swoopy = swoopyDrag()
    //   // .draggable(true)
    //   .x(d => d.dateX)
    //   .y(d => d.dateY)
    //   .on('drag', () => window.annotations = annotations)
    //   .annotations(annotations)


    // const swoopySel = womenSvg.append('g')
    //   .classed('swoopy-arrow-group', true)
    //   .call(swoopy);

    // swoopySel.selectAll('path')
    // // .attr('class', d => `swoopy-path-${d.dateY}`)
    // .attr('fill', 'none')
    // .attr('stroke', '#000')
    // .attr('stroke-opacity', 0)
    // .attr('marker-end', 'url(#arrow)')

    // swoopySel.selectAll('text')
    //   .attr('fill-opacity', 0)

    // initScroll(dates);
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
            .attr('fill', '#ff7e00')
            .attr('opacity', 0)
            .attr('r', 2.5)
            .style("transform", d => {
                const x = (Math.random() - 0.5) * 10;
                const y = (Math.random() - 0.5) * 10;
                return `translate(${x}px,${y}px)`;
            })
            .each(function(d, i, a) {
                const node = d3.select(this);

                if (i === 0) {
                    const count = d.womenPaidLess;

                    const grid = Math.ceil(Math.sqrt(count));

                    sampler = poissonDiscSampler(cellSizeMargin, cellSizeMargin, Math.floor(cellSizeMargin / (grid * 1.28)));
                }

                var s = sampler();

                node.attr('cx', (d, i, a) => {
                        return s[0] + 5;
                    })
                    .attr('cy', (d, i, a) => s[1] + 5)
            });


        d3.select(domElement).selectAll(".day-group")
            .classed('weekend', function(d) {
                return d.isWeekend === true;
            })
    })
}

function poissonDiscSampler(width, height, radius) {
    var k = 60, // maximum number of samples before rejection
        radius2 = radius * radius,
        R = 3 * radius2,
        cellSize = radius * Math.SQRT1_2,
        gridWidth = Math.ceil(width / cellSize),
        gridHeight = Math.ceil(height / cellSize),
        grid = new Array(gridWidth * gridHeight),
        queue = [],
        queueSize = 0,
        sampleSize = 0;

    return function() {
        if (!sampleSize) return sample(width * 0.5, height * 0.5);

        // Pick a random existing sample and remove it from the queue.
        while (queueSize) {
            var i = Math.random() * queueSize | 0,
                s = queue[i];

            // Make a new candidate between [radius, 2 * radius] from the existing sample.
            for (var j = 0; j < k; ++j) {
                var a = 2 * Math.PI * Math.random(),
                    r = Math.sqrt(Math.random() * R + radius2),
                    x = s[0] + r * Math.cos(a),
                    y = s[1] + r * Math.sin(a);

                // Reject candidates that are outside the allowed extent,
                // or closer than 2 * radius to any existing sample.
                if (0 <= x && x < width && 0 <= y && y < height && far(x, y)) return sample(x, y);
            }

            queue[i] = queue[--queueSize];
            queue.length = queueSize;
        }
    };

    function far(x, y) {
        var i = x / cellSize | 0,
            j = y / cellSize | 0,
            i0 = Math.max(i - 2, 0),
            j0 = Math.max(j - 2, 0),
            i1 = Math.min(i + 3, gridWidth),
            j1 = Math.min(j + 3, gridHeight);

        for (j = j0; j < j1; ++j) {
            var o = j * gridWidth;
            for (i = i0; i < i1; ++i) {
                if (s = grid[o + i]) {
                    var s,
                        dx = s[0] - x,
                        dy = s[1] - y;
                    if (dx * dx + dy * dy < radius2) return false;
                }
            }
        }

        return true;
    }

    function sample(x, y) {
        var s = [x, y];
        queue.push(s);
        grid[gridWidth * (y / cellSize | 0) + (x / cellSize | 0)] = s;
        ++sampleSize;
        ++queueSize;
        return s;
    }
}

var sampler = poissonDiscSampler(cellSize, cellSize, 5)

// var svg = d3.select("body").append("svg")
//     .attr("width", 1000)
//     .attr("height", 1000);

// d3.timer(function() {
//     for (var i = 0; i < 10; ++i) {
//         var s = sampler();
//         if (!s) return true;
//         svg.append("circle")
//             .attr("cx", s[0])
//             .attr("cy", s[1])
//             .attr("r", 0)
//             .transition()
//             .attr("r", 2);
//     }
// });



// const randomPos = (input) => {
//     const newVal = input + (Math.random() - 0.5) * 30;
//     if (newVal < (cellSize - 5) && newVal > 5) {
//         return newVal;
//     } else {
//         console.log(input, newVal)
//         return randomPos(input);
//     }
// }

// const findClosest = (points, point) => {
//     let min = Math.Infinity
//     let closest = points[0] || [cellSize / 2, cellSize / 2]
//     points.forEach(p => {
//         if (distance(point, p) <= min) {
//             closest = p;
//             min = distance(point, p);
//         } else {
//             // nothing
//         }
//     });
//     return closest;
// }

// let samples = [];

// function sample(width, height, numCandidates) {
//     var bestCandidate, bestDistance = 0;
//     for (var i = 0; i < numCandidates; ++i) {
//         var c = [Math.random() * width, Math.random() * height],
//             d = distance(findClosest(samples, c), c);
//         if (d > bestDistance) {
//             bestDistance = d;
//             bestCandidate = c;
//         }
//     }
//     samples.push(bestCandidate)
//     return bestCandidate;
// }

// function distance(a, b) {
//     var dx = a[0] - b[0],
//         dy = a[1] - b[1];

//     return Math.sqrt(dx * dx + dy * dy);
// }

const calcCirclePos = (d, i, a, xOrY) => {
    const count = d.womenPaidLess;

    // const grid = Math.ceil(Math.sqrt(count));

    // const y = Math.floor(i / grid);

    // const x = i % grid;

    // const unit = cellSize / grid;

    // console.log(x, y, unit);

    // if (xOrY === "x") {
    //     return randomPos(x * unit);
    // } else {
    //     return randomPos(y * unit);
    // }

    const sampled = sample(cellSize, cellSize, 1);
    return sampled;
}

const onScroll = (domElements, cellSize) => {
    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    domElements.forEach(element => {
        const monthAsInt = monthsArray.indexOf(element.classList[1]);


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
            const elemRect = group.getBoundingClientRect();
            // const centroid = elemRect.top + elemRect.height / 2;
            const wTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0)
            const wHeight = (window.innerHeight) / 2;
            const windowCenter = wTop + wHeight;
            const d3Container = d3.select(container);
            const arrows = d3Container.selectAll('.swoopy-arrow-group');

            if (d3.select(group).attr("data-transitioned") !== "yes" && elemRect.top < 500) {
                d3.select(group).attr("data-transitioned", "yes");
                size += d3.select(group).selectAll(".dayData").size();

                d3.select(group).selectAll(".day-group").selectAll(".dayData")
                    .transition()
                    .delay((d, i, a) => {
                        // console.log(d3.easeCubicIn((i / a.length)));
                        return d3.easeCubicIn((i / a.length)) * 1000;
                    })
                    .ease(d3.easeExpOut)
                    .duration(500)
                    .style("transform", d => {
                        return `translate(${0}px,${0}px)`;
                    })
                    .style("opacity", "1")
                    .attr('r', 2.5)
            }

            if (d3.select(group).attr("data-transitioned") === "yes" && elemRect.top > 500) {
                d3.select(group).attr("data-transitioned", "no");
                size -= d3.select(group).selectAll(".dayData").size();
            }

            if (elemRect.top > 500) {
                d3.select(group).selectAll(".dayData")
                    .transition()
                    .delay(i => {
                        return Math.random() * 500;
                    })
                    .ease(d3.easeExpOut)
                    .duration(250)
                    .style("opacity", "0")
                    .attr('r', 2.5)

            }

            // d3.select(group).selectAll("text")
            //     .transition()
            //     .delay((d, i) => i * 100)
            //     .ease(d3.easeExpOut)
            //     .duration(2000)
            //     .style("opacity", d => elemRect.top < 500 ? "1" : "0");
        });

        /* Swoopy arrows stuff */
        // arrows.selectAll('path')
        //   .transition()
        //   .delay(0)
        //   .ease(d3.easeExpOut)
        //   .duration(4000)
        //   .attr('stroke-opacity', d => elemRect.top + 508 < windowCenter ? 1 : 0)
        //   .attr('marker-end', 'url(#arrow)')

        // arrows.selectAll('text')
        //   .transition()
        //   .delay(0)
        //   .ease(d3.easeExpOut)
        //   .duration(4000)
        //   .attr('fill-opacity', 1)

        // d3Container.selectAll('marker')
        //   .transition()
        //   .delay(0)
        //   .ease(d3.easeExpOut)
        //   .duration(4000)
        //   .attr('fill-opacity', 1)

        /* Highilighting parts of calendar (not working) */
        // d3.select('.gv-w').select("rect[id='2018-01-20']")
        //   .attr('fill', d => console.log(this))
        //   .attr('fill-opacity', 1)
    });

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