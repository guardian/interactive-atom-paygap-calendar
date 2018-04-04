import makeMonthSvgs from './makeMonth';

import * as d3 from "d3"

import { swoopyDrag } from 'd3-swoopy-drag';
import loadJson from '../components/load-json';
import Awesomeplete from './awesomplete.js'

// helper funcs
const isSameDay = (dateToCheck, actualDate) => { return dateToCheck.getDate() === actualDate.getDate() && dateToCheck.getMonth() === actualDate.getMonth() && dateToCheck.getFullYear() === actualDate.getFullYear() };

// config variables
const cellSize = Math.floor(document.querySelector(".interactive-atom").clientWidth / 7);
const cellSizeMargin = cellSize - 10;
const container = document.querySelector('.months-container');
const december = document.querySelector('.december');

const counter = document.querySelector(".counter-sticky");
const counterMarker = document.querySelector(".counter-marker");
const counterParent = document.querySelector(".counter-container");
const counterSticky = document.querySelector('.counter-number');
const counterMonth = document.querySelector('.counter-month')
const domElements = document.querySelectorAll('.cal-month'); // months need to be named correctly in the css classes, all lowercase
let size = 0;
let lastScroll = null;

const showThreshold = window.innerHeight / 2;
const annotationsThreshold = window.innerHeight / 2;

var formatMonth = d3.timeFormat("%e %B");

makeMonthSvgs(domElements, cellSize);

//load annotations, parse csv and do stuff
loadJson('https://interactive.guim.co.uk/docsdata-test/1BxXGXMice-3-fCx61MLLDzx18bsE-n85w1SbaWHjiWE.json').then(res => {
    let circleAnnotations = res.annotations;

    d3.csv(process.env.PATH + "/assets/final_1.csv", function(error, csv) {
        if (error) throw error;

        const csvWithHighlights = csv.map(d => {
            const index = circleAnnotations.map(f => Number(f.gap)).indexOf(Number(d.DiffMedianHourlyPercent));
            if (index > -1) {
                d.highlighted = true;
                d.companyName = circleAnnotations[index].company;
                circleAnnotations.splice(index, 1);
            }
            return d;
        });

        var totalCompaniesReporting = 0;
        //get number of weekdays in the year
        var totalWeekDays = getTotalWeekDays();

        var dates = [];

        // NB POSSIBLY REVIEW: HAD TO CHANGE THIS FROM < TO <= TO PREVENT IT FROM BREAKING WITH THE NEW DATASET
        for (var i = 0; i <= totalWeekDays; i++) {
            dates.push({
                womenPaidLess: 0,
                menPaidLess: 0,
                isWeekend: false,
                highlightCompanyName: null,
                highlighted: false
                    // payGaps: []
            })
        }

        //group company totals into days on a calendar
        csvWithHighlights.filter(d => Number(d.DiffMedianHourlyPercent) >= -100 && Number(d.DiffMedianHourlyPercent) <= 100).forEach(d => {
            let lower = Number(d.DiffMedianHourlyPercent);
            let val = 1;
            totalCompaniesReporting += val;
            let day = totalWeekDays - Math.floor(Math.abs(lower) / 100 * totalWeekDays);
            if (lower === 0) {
                //skip
            } else if (lower > 0) {
                //women paid less
                // dates[day].payGaps.push(lower)
                dates[day].womenPaidLess += val;
                dates[day].highlightCompanyName = dates[day].highlightCompanyName || d.companyName;
                dates[day].highlighted = dates[day].highlighted || d.highlighted;
            } else if (lower < 0 && lower > -2000) {
                //men paid less
                dates[day].menPaidLess += val;
            }
        });

        let dayArray = new Array(totalWeekDays).fill(null);

        var counter = 0;
        for (var day = 1; day < 365 + 1; day++) {
            var curday = new Date(2018, 0, day);

            if (curday.getDay() !== 6 && curday.getDay() !== 0) {
                dayArray[counter] = curday;
                counter++;
            }
        }

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];


        // const toLog = csvWithHighlights.map(d => {

        //     if (Number(d.DiffMedianHourlyPercent) > 0) {
        //         let day = totalWeekDays - Math.floor(Number(d.DiffMedianHourlyPercent) / 100 * totalWeekDays);

        //         if (day < 261) {
        //             d.date = dayArray[day].getDate() + " " + monthNames[dayArray[day].getMonth()];
        //         }

        //     }

        //     return d;

        // });

        // console.log(JSON.stringify(toLog));


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
        });
        var maxTotal = (totalWomenCounter > totalMenCounter) ? totalWomenCounter : totalMenCounter;
        var maxPct = maxTotal / totalCompaniesReporting;

        //creates percents of totals
        dates.forEach(function(d) {
            d.womenPctPaidLess = d.womenTotalPaidLess / totalCompaniesReporting;
            d.menPctPaidLess = d.menTotalPaidLess / totalCompaniesReporting;
        });

        //search box

        const parent = d3.select("#search-box-parent");

        const searchBox = parent.insert("div", ":first-child").classed("search-container", true);
        const input = searchBox.append("input").classed("colour", true);

        input.attr("placeholder", "Find a company …");

        // const buttonsWrapper = searchBox.append("div").classed("buttons", true);

        // const companiesToButton = ["Schoolsworks Academy Trust", "Sussex Learning Trust", 'Asos.com Limited', 'Credit Suisse (UK) Limited'];

        const awesome = new Awesomplete(input.node(), {
            list: csvWithHighlights.map(d => d.EmployerName)
        });

        const close = d3.select('.awesomplete').append("div").style("display", "none").classed("search", true);

        close.html(`<svg class="icon-cancel" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 30 30">
        <path d="m 8.2646211,7.64 -0.985372,0.992 6.8996289,7.5523 7.720992,6.739 0.821373,-0.8267 -6.899628,-7.5524 -7.5569939,-6.9042" fill="#000"></path>
        <path d="m 7.2792491,21.64 0.985372,0.9854 7.5569939,-6.8977 6.899628,-7.5523 -0.985381,-0.992 -7.556984,6.9042 -6.8996289,7.5524" fill="#000"></path>
        </svg>`);

        close.on("click", function(e) {
            close.style("display", "none");
            input.node().value = "";
            d3.select(".label-g").remove();

            d3.select(".search-box-date").html(``);

            d3.select(".search-box-gap").html(``);
        });

        input.on("keyup", function(e) {
            if (input.node().value.length > 0) {
                close.style("display", "inline-block");
            } else {
                close.style("display", "none");
            }
        });

        // let dayArray = new Array(totalWeekDays).fill(null);
        // var counter = 0;
        // for (var day = 1; day < 365 + 1; day++) {
        //     var curday = new Date(2018, 0, day);

        //     if (curday.getDay() !== 6 && curday.getDay() !== 0) {
        //         dayArray[counter] = curday;
        //         counter++;
        //     }
        // }

        // const monthNames = ["January", "February", "March", "April", "May", "June",
        //     "July", "August", "September", "October", "November", "December"
        // ];

        function selectedCompany(company) {
            const textBox = d3.select(".search-box-result");
            const paygap = Number(csvWithHighlights.filter(d => d.EmployerName === company)[0].DiffMedianHourlyPercent);

            let day = totalWeekDays - Math.floor(Math.abs(paygap) / 100 * totalWeekDays);

            d3.select(".search-box-result").style("display", "inline-block").html(`${company}`);

            d3.select(".search-box-gap").style("display", "inline-block").html(`${Math.abs(paygap)}%`);


            if (paygap > 0) {
                d3.select("#search-box-parent").attr("class", "positive");
                d3.select(".search-stop-language").html(`effectively stops paying women on`);
                d3.select(".search-paygap-language").html(`a pay gap of`);
                d3.select(".search-box-date").style("display", "inline-block").html(`${dayArray[day].getDate()} ${monthNames[dayArray[day].getMonth()]}`);
            } else if (paygap < 0) {
                d3.select("#search-box-parent").attr("class", "negative");
                d3.select(".search-stop-language").html(`pays women for the full 12 months`);
                d3.select(".search-paygap-language").html(`women outearn men by `);
                d3.select(".search-box-date").style("display", "none").html(``);
            } else {
                d3.select("#search-box-parent").attr("class", "neutral");
                d3.select(".search-stop-language").html(`pays women for the full 12 months`);
                d3.select(".search-paygap-language").html(`there is no pay gap between men and women`);
                d3.select(".search-box-gap").style("display", "none").html(``);
                d3.select(".search-box-date").style("display", "none").html(``);
            }

        }

        document.addEventListener("awesomplete-selectcomplete", function(e) {
            const company = e.text.label;

            selectedCompany(company);
        });

        // addData(dates, totalWomenCounter);
        addData(dates, domElements);


        function checkScroll() {
            if (Math.abs(lastScroll - window.pageYOffset) > 36) {
                onScroll(domElements, cellSize, dates);
                // size = d3.selectAll(".has-data").size();
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

        const annotations = [
            {
              "month": "january",
              "dateX": 40,
              "dateY": -224,
              "path": "M198,448C139,483,153,564,215,589",
              "text": "Zero companies stopped paying women in January",
              "date": "2018-01-31",
              "textOffset": [
                217,
                451
              ],
              "length": 25
            },
            {
              "month": "february",
              "dateX": 40,
              "dateY": -224,
              "path": "M332,576C331,557,337,526,389,532",
              "text": "Already working for free this year",
              "date": "2018-02-23",
              "textOffset": [
                320,
                595
              ],
              "length": 18
            },
            {
              "month": "april",
              "dateX": 0,
              "dateY": -224,
              "path": "M312,587C269,505,293,372,428,358",
              "text": "Only 8 women in higher-paid  pilot roles",
              "date": "2018-04-13",
              "textOffset": [
                276,
                608
              ],
              "length": 20
            },
            {
              "month": "may",
              "dateX": 0,
              "dateY": -224,
              "path": "M462,566C376,527,227,533,138,609",
              "text": "First FTSE100 company",
              "date": "2018-05-28",
              "textOffset": [
                449,
                599
              ],
              "length": 16
            },
            {
              "month": "june",
              "dateX": 0,
              "dateY": -220,
              "path": "M109,294C155,379,259,442,435,441",
              "text": "44 of 1,754 employees are men at Phase Eight",
              "date": "2018-06-15",
              "textOffset": [
                85,
                259
              ],
              "length": 25
            },
            {
              "month": "september",
              "dateX": 23.548387096774196,
              "dateY": -131.8709677419355,
              "path": "M84,583C86,527,104,449,151,398",
              "text": "Most of the school's highest-paid staff are male teachers",
              "date": "2018-09-11",
              "textOffset": [
                79,
                603
              ],
              "length": 30
            }
          ];

        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

        months.forEach(month => {
            const monthSvg = d3.select("." + month)
                .select("svg")

            const swoopy = swoopyDrag()
                 //.draggable(true)
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
                // .attr('stroke-opacity', 0)
                .attr('marker-end', 'url(#arrow)')

            // arrow tip
            monthSvg
                .append('marker')
                .attr('id', 'arrow')
                // .attr('fill-opacity', 0)
                .attr('viewBox', '-10 -10 20 20')
                .attr('markerWidth', 10)
                .attr('markerHeight', 20)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M-6.75,-6.75 L 0,0 L -6.75,6.75')

            swoopySel.selectAll('text')
                // .attr('fill-opacity', 0)
                .each(function(d) {
                    d3.select(this)
                        .text('');
                    tspans(d3.select(this), wordwrap(d.text, d.length), 16)
                });

            const onTop = monthSvg.append("g").classed("on-top", true).style('opacity', 1);

            annotations.filter(d => d.month === month).forEach(a => {
                const rect = d3.select("#d" + a.date);
                const rectTransform = rect.node().parentNode.getAttribute("transform");
                const removed = rect.style("stroke", "#000").style("stroke-width", "1px").attr("transform", rectTransform).style("fill", "transparent");

                onTop.append(function() {
                    return rect.node();
                })
            });
        });
    });

});
// should this take an array of month elements?
const addData = (dates, domElements) => {

    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    for (let p = 0; p < domElements.length; p++) {
        // if (i === 3) { break; }
        // text += "The number is " + i + "<br>";

        const domElement = domElements[p];

        const monthAsInt = monthsArray.indexOf(domElement.classList[1]);
        const firstDayOfMonth = new Date(2018, monthAsInt, 1);
        const lastDayOfMonth = d3.timeDays(firstDayOfMonth, new Date(2018, monthAsInt + 1, 1)).slice(-1)[0];

        const firstDayIndex = dates.findIndex(d => isSameDay(d.date, firstDayOfMonth));
        const lastDayIndex = dates.findIndex(d => isSameDay(d.date, lastDayOfMonth));

        const filteredDates = dates.slice(firstDayIndex, lastDayIndex + 1);
        const month = d3.select(domElement);

        month.selectAll(".day-group").data(filteredDates);

        const daysInMonth = d3.select(domElement).selectAll(".day-group");
        const windowWidth = window.innerWidth;

        const calcCircleRadius = (windowWidth) => {
            if (windowWidth < 400) {
                return 1;
            } else if (windowWidth < 980) {
                return 1.5;
            } else if (windowWidth < 1140) {
                return 1.8;
            } else if (windowWidth >= 1140) {
                return 2.25;
            }
        }

        const calcDistanceRadius = (windowWidth) => {
            if (windowWidth < 400) {
                return 1.5;
            } else if (windowWidth < 560) {
                return 2;
            } else if (windowWidth < 740) {
                return 2;
            } else if (windowWidth < 1140) {
                return 2.5;
            } else if (windowWidth >= 1140) {
                return 3.25;
            }
        }

        const circleRadius = calcCircleRadius(windowWidth);
        const distanceRadius = calcDistanceRadius(windowWidth);

        const parent = daysInMonth
            .append("g")
            .attr('opacity', 0)
            .classed("circle-g", true)
            .selectAll("circle")
            .data(d => d3.packSiblings(d3.range(d['womenPaidLess']).map(() => ({ r: distanceRadius, highlighted: d.highlighted, highlightCompanyName: d.highlightCompanyName, isFriday: d.isFriday, isMonday: d.isMonday }))))
            .enter();

        const circles = parent
            .append("circle")
            .attr('class', 'dayData')
            .attr('fill', '#ff7e00')
            // .attr('opacity', 0)
            .attr('r', circleRadius)
            .attr('cx', d => d.x + cellSize / 2)
            .attr('cy', d => d.y + cellSize / 2)

        const firstHighlight = parent.filter(d => d.highlighted).filter((d, i) => i === 0)

        firstHighlight.append("text")
            .classed('circle-label', true)
            .attr("x", cellSize / 2)
            .attr('y', cellSize / 2)
            .attr("text-anchor", d => {
                if (d.isFriday && windowWidth < 980 && d.highlightCompanyName > 24) {
                    return 'end';
                } else if (d.isMonday && windowWidth < 980 && d.highlightCompanyName > 24) {
                    return 'start';
                } else {
                    return 'middle'
                }
            })
            .attr('dy', 18)
            .style('stroke', 'white')
            .style('stroke-width', '3px')
            .style('opacity', 1)
            .text(d => d.highlightCompanyName)


        firstHighlight.append('text')
            .classed('circle-label-outline', true)
            .attr("x", cellSize / 2)
            .attr('y', cellSize / 2)
            .attr('dy', 18)
            .attr("text-anchor", d => {
                if (d.isFriday && windowWidth < 980 && d.highlightCompanyName > 24) {
                    return 'end';
                } else if (d.isMonday && windowWidth < 980 && d.highlightCompanyName > 24) {
                    return 'start';
                } else {
                    return 'middle'
                }
            })
            .style('opacity', 1)
            .text(d => d.highlightCompanyName)

        daysInMonth.select('.dayData')
            // .attr('r', d => d.highlighted ? 6 : 3)
            .attr('stroke', d => d.highlighted ? 'black' : 'none')

        d3.select(domElement).selectAll(".day-group")
            .classed('weekend', function(d) {
                return d.isWeekend === true;
            })

        const days = d3.select(domElement).selectAll(".day-group");

        days.classed('weekend', d => d.isWeekend)
        days.classed('monday', d => d.isMonday)
        days.classed('friday', d => d.isFriday)

        const monthSvg = month.select('svg').selectAll(".week-group");

        monthSvg.each(function() {
            const textOnTop = d3.select(this).append("g").classed("text-on-top", true);

            d3.select(this).selectAll('.circle-label, .circle-label-outline').each(function(a) {
                const text = d3.select(this);
                const textTransform = text.node().parentNode.parentNode.getAttribute("transform");
                const removed = text.attr("transform", textTransform).remove();

                textOnTop.append(function() {
                    return removed.node();
                })
            });
        });

        // monthSvg.selectAll('.circle-label-outline').each(function(a) {
        //     const text = d3.select(this);
        //     const textTransform = text.node().parentNode.getAttribute("transform");
        //     const removed = text.attr("transform", textTransform);

        //     textOnTop.append(function() {
        //         return text.node();
        //     })
        // });
    }
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

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const calcCirclePos = (d, i, a, xOrY) => {
    const count = d.womenPaidLess;

    // const grid = Math.ceil(Math.sqrt(count));

    // const y = Math.floor(i / grid);

    // const x = i % grid;

    // const unit = cellSize / grid;

    // if (xOrY === "x") {
    //     return randomPos(x * unit);
    // } else {
    //     return randomPos(y * unit);
    // }

    const sampled = sample(cellSize, cellSize, 1);
    return sampled;
}

const onScroll = (domElements, cellSize, dates) => {
    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let shouldBreak = false;
    let latestWeek = "";

    if (counterMarker.getBoundingClientRect().top <= 0) {
        counter.classList.add("unfixed-bottom");
    } else if (counterParent.getBoundingClientRect().top <= 0) {
        counter.classList.remove("unfixed-bottom");
        counter.classList.add("fixed");
    } else {
        counter.classList.remove("fixed");
        counter.classList.remove("unfixed-bottom");
    }

    for (let p = 0; p < domElements.length; p++) {
        const element = domElements[p];
        const monthBbox = element.getBoundingClientRect();
        const monthInView = monthBbox.top < window.innerHeight & monthBbox.bottom > 0;
        // const scrolledPast = monthBbox.bottom > 0;

        if (monthInView) {
            if (!element.weekEls) {
                element.weekEls = element.querySelectorAll(".week-group");
            }

            for (let c = 0; c < element.weekEls.length; c++) {
                const group = element.weekEls[c];
                const groupRect = group.getBoundingClientRect();

                if (groupRect.top < showThreshold) {
                    group.classList.add("has-data");
                    d3.select(group).attr("data-foo", d => {
                        latestWeek = d.values[(d.values.length - 1)];
                    });
                } else {
                    group.classList.remove("has-data");
                }

                if (!group.labels) {
                    group.labels = d3.select(group).selectAll('.circle-label, .circle-label-outline');
                }

                group.labels.style('opacity', groupRect.top < showThreshold ? 1 : 0)
            }
        }
    }

    counterMonth.innerHTML = formatMonth(latestWeek);

    const counterNewNumberFilter = dates.filter(d => { return d.date && latestWeek && latestWeek.getTime() && latestWeek.getTime() == d.date.getTime() })[0];

    let counterNewNumber;

    if (counterNewNumberFilter) {
        counterNewNumber = counterNewNumberFilter.womenTotalPaidLess;
    } else {
        counterNewNumber = 0;
    }

    const moreThan = document.querySelector(".more-than");
    const lessThan = document.querySelector(".less-than");

    d3.select(counterSticky)
        .transition()
        .duration(500)
        .delay(0)
        .tween('text', function() {
            const currentVal = parseInt(this.textContent.replace(/,/g, ""));
            const i = d3.interpolate(currentVal, counterNewNumber)
            return (t) => {
                // console.log(t);
                if (i(t) !== 1) {
                    moreThan.style.display = "inline";
                    lessThan.style.display = "none";
                } else {
                    moreThan.style.display = "none";
                    lessThan.style.display = "inline";
                }
                d3.select(counterSticky).text(numberWithCommas(parseInt(i(t))));
            }
        });
}

const transitionCircles = (group, groupRect) => {
    if (!group.days) {
        group.days = d3.select(group).selectAll(".circle-g");
    }

    group.days
        .classed('has-data', d => groupRect.top < showThreshold)
        // .transition()
        // .delay((d, i, a) => {
        //     return groupRect.top < showThreshold ? d3.easeCubicIn((i / a.length)) * 1000 : Math.random() * 500;
        // })
        // // .ease(d3.easeExpOut)
        // .duration(0)
        // .style("transform", d => {
        //     return "none";
        // })
        // .style("opacity", groupRect.top < showThreshold ? "1" : 0)
        // .attr('r', 2.5)

    // d3.select(group).selectAll("text")
    //     .transition()
    //     .delay((d, i) => i * 100)
    //     .ease(d3.easeExpOut)
    //     .duration(500)
    //     .style("fill", d => groupRect.top < showThreshold ? "#000" : "#f6f6f6");

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
        if (curday.getDay() === 6 || curday.getDay() === 0) {
            dates.splice(day, 0, {
                womenPaidLess: 0,
                menPaidLess: 0,
                isWeekend: true
            });
        }
        if (curday.getDay() === 1) {

        }
        const isMonday = curday.getDay() === 1;
        const isFriday = curday.getDay() === 5;

        dates[day].isMonday = isMonday;
        dates[day].isFriday = isFriday;
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