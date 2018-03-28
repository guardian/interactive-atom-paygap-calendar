import makeMonthSvgs from './makeMonth';
import * as d3 from "d3"
import { swoopyDrag } from 'd3-swoopy-drag';

// helper funcs
const calcXDatePosition = (date, cellSize) => date.getDay() * cellSize;
const calcYDatePosition = (date, cellSize) => d3.timeWeek.count(d3.timeMonth(date), date) * cellSize;
const isSameDay = (dateToCheck, actualDate) => { return dateToCheck.getDate() === actualDate.getDate() && dateToCheck.getMonth() === actualDate.getMonth() && dateToCheck.getFullYear() === actualDate.getFullYear() };

// config variables
const cellSize = Math.floor(document.querySelector(".interactive-atom").clientWidth / 7);
const cellSizeMargin = cellSize - 10;
const container = document.querySelector('.months-container');
const december = document.querySelector('.december');
const november = document.querySelector('.november');

const counterSticky = document.querySelector('.counter-number');
const counterMonth = document.querySelector('.counter-month')
const domElements = document.querySelectorAll('.cal-month'); // months need to be named correctly in the css classes, all lowercase
const genders = ['women', 'men'];
let size = 0;
let lastScroll = null;

var formatMonth = d3.timeFormat("%e %B");

makeMonthSvgs(domElements, cellSize);


// parse csv and do stuff
d3.csv(process.env.PATH + "/assets/latest.csv", function(error, csv) {
    if (error) throw error;

    // const csvWithHighlights = csv.map(d => {
    //     const index = highlightedCirclesSheet.indexOf(e => d.paygap === e.DiffMedianHourlyPercent);

    //     if (index > -1) {
    //         d.highlighted = true;
    //         d.companyName = highlightedCirclesSheet[index].EmployerName;
    //         highlightedCirclesSheet.splice(index, 1);
    //     }
    //     return d;
    // });

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
        let lower = Number(d.DiffMedianHourlyPercent);
        let val = 1;
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
    });

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
            size = d3.selectAll(".has-data").size();
            lastScroll = window.pageYOffset;
        }
        window.requestAnimationFrame(() => {
            checkScroll();
        });
    }

    checkScroll();

    /* Swoopy arrow stuff */

    function resizePos(annotationPos) {
        return annotationPos * (document.querySelector(".interactive-atom").clientWidth / 620)
    }

    function cleanAnnotations(annotations) {
        return annotations.map(a => {
            a.dateX = resizePos(a.dateX);
            a.dateY = resizePos(a.dateY);
            a.textOffset[0] = resizePos(a.textOffset[0]);
            a.textOffset[1] = resizePos(a.textOffset[1]);
            a.path = a.path.replace(/[0-9]+/g, m => resizePos(Number(m)));

            return a;
        });
    }

    const annotations = [{
        "month": "january",
        "dateX": 40,
        "dateY": -224,
        "path": "M325,592C286,574,267,537,266,490",
        "text": "17 January is the first day when a company stops paying women. A 95.5% pay gap",
        "date": "2018-01-17",
        "textOffset": [
            331,
            597
        ],
        "length": document.querySelector(".interactive-atom").clientWidth === 620 ? 30 : 18
    }]

    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

    months.forEach(month => {
        const monthSvg = d3.select("." + month)
            .select("svg")

        const swoopy = swoopyDrag()
            // .draggable(true)
            .x(d => d.dateX)
            .y(d => d.dateY)
            .on('drag', () => window.annotations = annotations)
            .annotations(cleanAnnotations(annotations.filter(d => d.month === month)))

        const swoopySel = monthSvg.select('.swoopy-arrow-group').call(swoopy);

        // arrow path
        swoopySel.selectAll('path')
            // .attr('class', d => `swoopy-path-${d.dateY}`)
            .attr('fill', 'none')
            .attr('stroke', '#000')
            .attr('stroke-opacity', 0)
            .attr('marker-end', 'url(#arrow)')

        // arrow tip
        monthSvg
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
            .each(function(d) {
                d3.select(this)
                    .text('');
                console.log(d.length);
                tspans(d3.select(this), wordwrap(d.text, d.length), 20)
            });

        const onTop = monthSvg.append("g").classed("on-top", true);

        annotations.filter(d => d.month === month).forEach(a => {
            const rect = d3.select("#d" + a.date);
            const rectTransform = rect.node().parentNode.getAttribute("transform");
            const removed = rect.style("stroke", "#000").style("stroke-width", "1px").attr("transform", rectTransform).style("fill", "transparent");

            console.log(rect.node());
            onTop.append(function() {
                return rect.node();
            })
        });
    });
});


// should this take an array of month elements?
const addData = (dates, domElements) => {

    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    domElements.forEach(domElement => {
        window.requestAnimationFrame(() => {
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
                .attr('r', 3.5)
                // .style("transform", d => {
                //     const x = (Math.random() - 0.5) * 10;
                //     const y = (Math.random() - 0.5) * 10;
                //     return `translate(${x}px,${y}px)`;
                // })
                .each(function(d, i, a) {
                    const node = d3.select(this);

                    if (i === 0) {
                        const count = d.womenPaidLess;

                        const grid = Math.ceil(Math.sqrt(count));

                        sampler = poissonDiscSampler(cellSizeMargin, cellSizeMargin, Math.floor(cellSizeMargin / (grid * 1.25)));
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
        });
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

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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
    let shouldBreak = false;
    let latestWeek = "";

    domElements.forEach(element => {
        const monthAsInt = monthsArray.indexOf(element.classList[1]);

        d3.select(counterSticky)
            .transition()
            .duration(500)
            .delay(0)
            .tween('text', function() {
                const currentVal = parseInt(this.textContent.replace(/,/g, ""));
                const i = d3.interpolate(currentVal, size)
                return (t) => {
                    d3.select(counterSticky).text(numberWithCommas(parseInt(i(t))));
                }
            });

        if (!element.weekEls) {
            console.log("f")
            element.weekEls = element.querySelectorAll(".week-group");
        }

        element.weekEls.forEach(group => {
            const groupRect = group.getBoundingClientRect();

            transitionCircles(group, groupRect)

            if (groupRect.top < 500) {
                d3.select(group).attr("data-foo", d => {
                    latestWeek = d.values[(d.values.length - 1)];
                });
            }

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

            // if (elemRect.top > 500) {
            //     d3.select(group).selectAll(".dayData")
            //         .transition()
            //         .delay(i => {
            //             return Math.random() * 500;
            //         })
            //         .ease(d3.easeExpOut)
            //         .duration(250)
            //         .style("opacity", "0")
            //         .attr('r', 2.5)

            // }
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

    counterMonth.innerHTML = formatMonth(latestWeek);

}

const transitionCircles = (group, groupRect) => {
    d3.select(group).selectAll(".day-group").selectAll(".dayData")
        .classed('has-data', d => groupRect.top < 500 && d['womenPaidLess'] > 0)
        .transition()
        .delay((d, i, a) => {
            return groupRect.top < 500 ? d3.easeCubicIn((i / a.length)) * 1000 : Math.random() * 500;
        })
        .ease(d3.easeExpOut)
        .duration(groupRect.top < 500 ? 500 : 250)
        .style("transform", d => {
            return "none";
        })
        .style("opacity", groupRect.top < 500 ? "1" : 0)
        // .attr('r', 2.5)

    d3.select(group).selectAll("text")
        .transition()
        .delay((d, i) => i * 100)
        .ease(d3.easeExpOut)
        .duration(2000)
        .style("fill", d => groupRect.top < 500 ? "#767676" : "#f6f6f6");

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

const tspans = function(parent, lines, lh) {
    return parent.selectAll('tspan')
        .data(function(d) {
            return (typeof(lines) == 'function' ? lines(d) : lines)
                .map(function(l) {
                    return { line: l, parent: d };
                });
        })
        .enter()
        .append('tspan')
        .text(function(d) { return d.line; })
        .attr('x', 0)
        .attr('dy', function(d, i) { return i ? (typeof(lh) == 'function' ? lh(d.parent, d.line, i) : lh) || 15 : 0; });
}

var CHAR_W = {
    A: 7,
    a: 7,
    B: 8,
    b: 7,
    C: 8,
    c: 6,
    D: 9,
    d: 7,
    E: 7,
    e: 7,
    F: 7,
    f: 4,
    G: 9,
    g: 7,
    H: 9,
    h: 7,
    I: 3,
    i: 3,
    J: 5,
    j: 3,
    K: 8,
    k: 6,
    L: 7,
    l: 3,
    M: 11,
    m: 11,
    N: 9,
    n: 7,
    O: 9,
    o: 7,
    P: 8,
    p: 7,
    Q: 9,
    q: 7,
    R: 8,
    r: 4,
    S: 8,
    s: 6,
    T: 7,
    t: 4,
    U: 9,
    u: 7,
    V: 7,
    v: 6,
    W: 11,
    w: 9,
    X: 7,
    x: 6,
    Y: 7,
    y: 6,
    Z: 7,
    z: 5,
    '.': 2,
    ',': 2,
    ':': 2,
    ';': 2
};

const wordwrap = function(line, maxCharactersPerLine, minCharactersPerLine, monospace) {
    var l, lines = [],
        w = [],
        words = [],
        w1, maxChars, minChars, maxLineW, minLineW;
    w1 = line.split(' ');
    w1.forEach(function(s, i) {
        var w2 = s.split('-');
        if (w2.length > 1) {
            w2.forEach(function(t, j) {
                w.push(t + (j < w2.length - 1 ? '-' : ''));
            });
        } else {
            w.push(s + (i < w1.length - 1 ? ' ' : ''));
        }
    });
    maxChars = maxCharactersPerLine || 40;
    minChars = minCharactersPerLine || Math.max(3, Math.min(maxChars * 0.5, 0.75 * w.map(word_len).sort(num_asc)[Math.round(w.length / 2)]));
    maxLineW = maxChars * CHAR_W.a;
    minLineW = minChars * CHAR_W.a;
    l = 0;
    w.forEach(function(d) {
        var ww = d3.sum(d.split('').map(char_w));
        if (l + ww > maxLineW && l > minLineW) {
            lines.push(words.join(''));
            words.length = 0;
            l = 0;
        }
        l += ww;
        return words.push(d);
    });
    if (words.length) {
        lines.push(words.join(''));
    }
    return lines.filter(function(d) {
        return d !== '';
    });

    function char_w(c) { return !monospace && CHAR_W[c] || CHAR_W.a; }

    function word_len(d) { return d.length; }

    function num_asc(a, b) { return a - b; }
}