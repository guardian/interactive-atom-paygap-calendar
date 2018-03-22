import * as d3 from "d3";

const makeMonthSvgs = (domElements, cellSize) => {
    const width = cellSize * 7;
    const height = cellSize * 5;
    const format = d3.timeFormat("%Y-%m-%d");
    const monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    domElements.forEach(domElement => {
        const monthAsInt = monthsArray.indexOf(domElement.classList[1]);

        // change this func to apply to a single month
        const monthPath = (t0) => {
            const t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0);
            const d0 = t0.getDay(),
                w0 = d3.timeWeek.count(d3.timeYear(t0), t0);
            const d1 = t1.getDay(),
                w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
            // console.log(t0, t1, d0, d1)
            return "M" + d0 * cellSize + "," + w0 * cellSize +
                "H" + 7 * cellSize + "V" + w0 * cellSize +
                "H" + 7 * cellSize + "V" + w1 * cellSize +
                "H" + (d1 + 1) * cellSize + "V" + w1 * cellSize +
                "H" + (d1 + 1) * cellSize + "V" + (w1 + 1) * cellSize +
                "H" + 0 + "V" + (w1 + 1) * cellSize +
                "H" + 0 + "V" + (w0 + 1) * cellSize +
                "H" + (d0) * cellSize + "V" + w0 * cellSize +
                'Z';
            // + "H" + w0 * cellSize + "V" + 7 * cellSize
            // + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
            // + "H" + (w1 + 1) * cellSize + "V" + 0
            // + "H" + (w0 + 1) * cellSize + "Z";
        }

        const svg = d3.select(domElement).selectAll("svg")
            .data(d3.range(2018, 2019))
            .enter().append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "month-svg")
            .append("g")

        //day rects
        svg.selectAll(".day")
            .data(e => { return d3.nest().key(d => d3.timeWeek.count(d3.timeMonth(d), d)).entries(d3.timeDays(new Date(2018, monthAsInt, 1), new Date(2018, monthAsInt + 1, 1))) })
            .enter()
            .append('g')
            .classed('week-group', true)
            .selectAll('g')
            .data(d => d.values)
            .enter()
            .append('g')
            .attr("class", "day-group")
            .attr('transform', d => `translate(${d.getDay() * cellSize}, ${d3.timeWeek.count(d3.timeMonth(d), d) * cellSize})`)
            .append("rect")
            .attr('id', format)
            .attr("class", "day")
            .style('fill', '#fff')
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr('x', 0)
            .attr('y', 0)
            .datum(format);

        svg.selectAll(".day-group")
            .each(function(d, i) {
                d3.select(this).append("text")
                    .text(i + 1)
                    .attr('y', 16)
                    .attr('x', 4)
                    .classed('date-label', true)
                    .style("opacity", "0")
            });


        // the data squares that the data is going to alter
        // svg.selectAll(".dayData")
        // .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        //   .data(d => {console.log(d); return d3.timeDays(new Date(2018, monthAsInt, 1), new Date(2018, monthAsInt + 1, 1))})
        // .enter()
        //   .append("rect")
        //   .attr("class", "dayData")
        //   .attr('id', d => `dayData-${format(d)}`)
        //   .attr("width", 0)
        //   .attr("height", 0)
        //   .attr("y", d => {return d3.timeWeek.count(d3.timeMonth(d), d) * cellSize + cellSize})
        //   .attr("x", d => d.getDay() * cellSize)


        //Adds month path. Enable this once the monthpath function works correctly

        // svg.selectAll(".month")
        // .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        // .enter().append("path")
        // .attr("class", "month")
        // .attr("d", monthPath);
    })
}


export default makeMonthSvgs;