/**
 * Created by Kornel on 11/4/14.
 */

(function(){

    var nv = window.nv || {};
    nv.models.linePlusLineChart = function() {
        "use strict";
        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var lines = nv.models.line()
            , bars = nv.models.line()
            , xAxis = nv.models.axis()
            , y1Axis = nv.models.axis()
            , y2Axis = nv.models.axis()
            , legend = nv.models.legend()
            , interactiveLayer = nv.interactiveGuideline()
            ;

        var margin = {top: 30, right: 60, bottom: 50, left: 60}
            , width = null
            , height = null
            , getX = function(d) { return d.x }
            , getY = function(d) { return d.y }
            , color = nv.utils.defaultColor()
            , showLegend = true
            , useInteractiveGuideline = false
            , tooltips = true
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + ' at ' + x + '</p>';
            }
            , x
            , y1
            , y2
            , state = {}
            , defaultState = null
            , noData = "No Data Available."
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
            , interactive = true
            ;
        /*
         bars
         .clipEdge(false)           // Added
         .padData(true)
         ;
         lines
         .clipEdge(false)
         .padData(true)
         ;*/
        xAxis
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(false)
        ;
        y1Axis
            .orient('left')
        ;
        y2Axis
            .orient('right')
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
                var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                    top = e.pos[1] + ( offsetElement.offsetTop || 0),
                    x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
                    y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
                    content = tooltip(e.series.key, x, y, e, chart);

                nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
            }
            ;

        //------------------------------------------------------------



        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { container.transition().call(chart); };
                // chart.container = this;

                //set state.disabled
                state.disabled = data.map(function(d) { return !!d.disabled });

                if (!defaultState) {
                    var key;
                    defaultState = {};
                    for (key in state) {
                        if (state[key] instanceof Array)
                            defaultState[key] = state[key].slice(0);
                        else
                            defaultState[key] = state[key];
                    }
                }

                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.nv-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'nvd3 nv-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.nv-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
                var dataLines = data.filter(function(d) { return !d.bar }); // removed the !d.disabled clause here to fix Issue #240

                //x = xAxis.scale();
                x = dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length ? lines.xScale() : bars.xScale();
                //x = dataLines.filter(function(d) { return !d.disabled; }).length ? lines.xScale() : bars.xScale(); //old code before change above
                y1 = bars.yScale();
                y2 = lines.yScale();

                //------------------------------------------------------------

                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = d3.select(this).selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'nv-x nv-axis');
                gEnter.append('g').attr('class', 'nv-y1 nv-axis');
                gEnter.append('g').attr('class', 'nv-y2 nv-axis');
                gEnter.append('g').attr('class', 'nv-barsWrap');
                gEnter.append('g').attr('class', 'nv-linesWrap');
                gEnter.append('g').attr('class', 'nv-legendWrap');
                gEnter.append('g').attr('class', 'nv-interactive');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend.width( availableWidth / 2 );

                    g.select('.nv-legendWrap')
                        .datum(data.map(function(series) {
                            series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                            // Modified by Kornel
                            series.key = series.originalKey + ' (' + series.metricName + ')';
                            //series.key = series.originalKey + (series.bar ? ' (left axis)' : ' (right axis)');
                            return series;
                        }))
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;
                    }

                    g.select('.nv-legendWrap')
                        .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------
                //Set up interactive layer
                if (useInteractiveGuideline) {
                    interactiveLayer
                        .width(availableWidth)
                        .height(availableHeight)
                        .margin({left:margin.left, top:margin.top})
                        .svgContainer(container)
                        .xScale(x);
                    wrap.select(".nv-interactive").call(interactiveLayer);
                }

                //------------------------------------------------------------
                // Main Chart Component(s)


                lines
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) {
                        return !data[i].disabled && !data[i].bar
                    }))

                bars
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) {
                        return !data[i].disabled && data[i].bar
                    }))



                var barsWrap = g.select('.nv-barsWrap')
                    .datum(data.filter(function(d) { return !d.disabled  && d.bar}) );

                var linesWrap = g.select('.nv-linesWrap')
                    .datum(data.filter(function(d) { return !d.disabled  && !d.bar}) );
                //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );

                barsWrap.transition().call(bars);
                linesWrap.transition().call(lines);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Axes

                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y1.range()[0] + ')');
                d3.transition(g.select('.nv-x.nv-axis'))
                    .call(xAxis);


                y1Axis
                    .scale(y1)
                    .ticks( availableHeight / 36 )
                    .tickSize(-availableWidth, 0);

                d3.transition(g.select('.nv-y1.nv-axis'))
                    .style('opacity', dataBars.length ? 1 : 0)
                    .call(y1Axis);


                y2Axis
                    .scale(y2)
                    .ticks( availableHeight / 36 )
                    .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

                g.select('.nv-y2.nv-axis')
                    .style('opacity', dataLines.length ? 1 : 0)
                    .attr('transform', 'translate(' + availableWidth + ',0)');
                //.attr('transform', 'translate(' + x.range()[1] + ',0)');
                d3.transition(g.select('.nv-y2.nv-axis'))
                    .style('opacity', dataLines.length ? 1 : 0)
                    .call(y2Axis);

                //------------------------------------------------------------


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('stateChange', function(newState) {
                    state = newState;
                    dispatch.stateChange(state);
                    chart.update();
                });

                interactiveLayer.dispatch.on('elementMousemove', function(e) {
                    lines.clearHighlights();
                    var singlePoint, pointIndex, pointXLocation, allData = [];
                    var primaryDate = '', compareDate = '', pointScale, dataPointIndex;
                    data
                        .filter(function(series, i) {
                            series.seriesIndex = i;
                            if (series.seriesIndex === 0) {
                                pointScale = series.values.length;
                            } else {
                                pointScale = d3.min([pointScale, series.values.length]);
                            }
                            return !series.disabled;
                        })
                        .forEach(function(series,i) {
                            if (series.values.length > pointScale) {
                                var scaledPointIndex = Math.round(series.values.length / pointScale);
                                pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                                dataPointIndex = pointIndex * scaledPointIndex;
                            } else {
                                pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                            }
                            lines.highlightPoint(i, pointIndex, true);
                            var point;
                            if (series.values.length > pointScale) {
                                point = series.values[dataPointIndex];
                            } else {
                                point = series.values[pointIndex];
                            }
                            if (typeof point === 'undefined') return;
                            if (typeof singlePoint === 'undefined') singlePoint = point;
                            if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                            if (series.isPrimaryRange) {
                                primaryDate = point.label;
                            } else {
                                compareDate = point.label;
                            }
                            allData.push({
                                key: series.key,
                                value: chart.y()(point, pointIndex),
                                color: color(series,series.seriesIndex)
                            });
                        });
                    //Highlight the tooltip entry based on which point the mouse is closest to.
                    if (allData.length > 2) {
                        var yValue = chart.yScale().invert(e.mouseY);
                        var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
                        var threshold = 0.03 * domainExtent;
                        var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                        if (indexToHighlight !== null)
                            allData[indexToHighlight].highlight = true;
                    }

                    //var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
                    interactiveLayer.tooltip
                        .position({left: pointXLocation + margin.left, top: e.mouseY + margin.top})
                        .chartContainer(that.parentNode)
                        .enabled(tooltips)
                        .valueFormatter(function(d,i) {
                            return y1Axis.tickFormat()(d);
                        })
                        .data(
                        {
                            value: primaryDate,
                            compareValue: compareDate,
                            series: allData
                        }
                    )();

                    interactiveLayer.renderGuideLine(pointXLocation);

                });

                interactiveLayer.dispatch.on("elementMouseout",function(e) {
                    dispatch.tooltipHide();
                    lines.clearHighlights();
                });

                dispatch.on('tooltipShow', function(e) {
                    //if (tooltips) showTooltip(e, that.parentNode);
                });


                // Update chart from a state object passed to event handler
                dispatch.on('changeState', function(e) {

                    if (typeof e.disabled !== 'undefined') {
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });

                        state.disabled = e.disabled;
                    }

                    chart.update();
                });

                //============================================================


            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        lines.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        lines.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        bars.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        bars.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) nv.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.legend = legend;
        chart.lines = lines;
        chart.bars = bars;
        chart.xAxis = xAxis;
        chart.y1Axis = y1Axis;
        chart.y2Axis = y2Axis;
        chart.interactiveLayer = interactiveLayer;

        //d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate', 'interactive', 'useVoronoi');
        d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
            , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate');
        //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
        //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

        chart.options = nv.utils.optionsFunc.bind(chart);

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            lines.x(_);
            bars.x(_);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = _;
            lines.y(_);
            bars.y(_);
            return chart;
        };

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = nv.utils.getColor(_);
            legend.color(color);
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.state = function(_) {
            if (!arguments.length) return state;
            state = _;
            return chart;
        };

        chart.defaultState = function(_) {
            if (!arguments.length) return defaultState;
            defaultState = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        }

        chart.useInteractiveGuideline = function(_) {
            if(!arguments.length) return useInteractiveGuideline;
            useInteractiveGuideline = _;
            if (_ === true) {
                chart.interactive(false);
                chart.useVoronoi(false);
            }
            return chart;
        };
        //============================================================


        return chart;
    }

    nv.models.pieChartBottomLegend = function() {
        "use strict";
        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var pie = nv.models.pie()
            , legend = nv.models.legend()
            ;

        /** modified by Rumen
         *
         * Story Description: As a TM, I need the Pie Widget legend below the charts, so that they are less obtrusive.
         *
         * Increase margin-bottom by 30 so that not be overlapped with the adjacent widget in the same colum
         */
        var margin = {top: 20, right: 10, bottom: 10, left: 10}
            , width = null
            , height = null
            , showLegend = true
            , color = nv.utils.defaultColor()
            , tooltips = true
            , tooltip = function(key, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + '</p>'
            }
            , state = {}
            , defaultState = null
            , noData = "No Data Available."
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
            var tooltipLabel = pie.description()(e.point) || pie.x()(e.point)
            var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
                top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
                y = pie.valueFormat()(pie.y()(e.point)),
                content = tooltip(tooltipLabel, y, e, chart);

            nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { container.transition().call(chart); };
                chart.container = this;

                //set state.disabled
                state.disabled = data.map(function(d) { return !!d.disabled });

                if (!defaultState) {
                    var key;
                    defaultState = {};
                    for (key in state) {
                        if (state[key] instanceof Array)
                            defaultState[key] = state[key].slice(0);
                        else
                            defaultState[key] = state[key];
                    }
                }

                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length) {
                    var noDataText = container.selectAll('.nv-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'nvd3 nv-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.nv-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.nv-wrap.nv-pieChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-pieChart').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'nv-pieWrap');
                gEnter.append('g').attr('class', 'nv-legendWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                var divWrapperHeight = 0;

                if (showLegend) {
                    legend
                        .width( availableWidth )
                        .key(pie.x());

                    wrap.select('.nv-legendWrap')
                        .datum(data)
                        .call(legend);

                    //var legendPosition = availableHeight - legend.height();
                    var legendPosition = availableWidth;

                    wrap.select('.nv-legendWrap')
                        //change the legend position to the bottom
                        //.attr('transform', 'translate(0,' + (-margin.top) +')');
                        .attr('transform', 'translate(0,' + legendPosition +')');

                    //availableHeight -= legend.height();
                    availableHeight = availableWidth;

                    divWrapperHeight += legend.height();
                }

                divWrapperHeight += availableHeight + margin.top + margin.bottom;
                var divWrapper = container.node().parentNode.parentNode;

                d3.select(divWrapper).style('height', divWrapperHeight + 'px');

                //------------------------------------------------------------


                //move the widget svg slightly up near to the widget title
                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
                //wrap.attr('transform', 'translate(' + margin.left + ', 0)');


                //------------------------------------------------------------
                // Main Chart Component(s)

                pie
                    .width(availableWidth)
                    .height(availableHeight);


                var pieWrap = g.select('.nv-pieWrap')
                    .datum([data]);

                d3.transition(pieWrap).call(pie);

                //------------------------------------------------------------


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('stateChange', function(newState) {
                    state = newState;
                    dispatch.stateChange(state);
                    chart.update();
                });

                pie.dispatch.on('elementMouseout.tooltip', function(e) {
                    dispatch.tooltipHide(e);
                });

                // Update chart from a state object passed to event handler
                dispatch.on('changeState', function(e) {

                    if (typeof e.disabled !== 'undefined') {
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });

                        state.disabled = e.disabled;
                    }

                    chart.update();
                });

                //============================================================


            });

            return chart;
        }

        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        pie.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        dispatch.on('tooltipShow', function(e) {
            if (tooltips) showTooltip(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) nv.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.legend = legend;
        chart.dispatch = dispatch;
        chart.pie = pie;

        d3.rebind(chart, pie, 'valueFormat', 'values', 'x', 'y', 'description', 'id', 'showLabels', 'donutLabelsOutside', 'pieLabelsOutside', 'labelType', 'donut', 'donutRatio', 'labelThreshold');
        chart.options = nv.utils.optionsFunc.bind(chart);

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = nv.utils.getColor(_);
            legend.color(color);
            pie.color(color);
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.state = function(_) {
            if (!arguments.length) return state;
            state = _;
            return chart;
        };

        chart.defaultState = function(_) {
            if (!arguments.length) return defaultState;
            defaultState = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        //============================================================


        return chart;
    }

    nv.models.linePlusBarChart2 = function() {
        "use strict";
        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var lines = nv.models.line()
            , bars = nv.models.historicalBar()
            , xAxis = nv.models.axis()
            , y1Axis = nv.models.axis()
            , y2Axis = nv.models.axis()
            , legend = nv.models.legend()
            , interactiveLayer = nv.interactiveGuideline()
            ;

        var margin = {top: 30, right: 60, bottom: 50, left: 60}
            , width = null
            , height = null
            , getX = function(d) { return d.x }
            , getY = function(d) { return d.y }
            , color = nv.utils.defaultColor()
            , showLegend = true
            , useInteractiveGuideline = false
            , tooltips = true
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + ' at ' + x + '</p>';
            }
            , x
            , y1
            , y2
            , state = {}
            , defaultState = null
            , noData = "No Data Available."
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
            , interactive = true
            ;

        bars
            .padData(true)
        ;
        lines
            .clipEdge(false)
            .padData(true)
        ;
        xAxis
            .orient('bottom')
            .tickPadding(7)
            .highlightZero(false)
        ;
        y1Axis
            .orient('left')
        ;
        y2Axis
            .orient('right')
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
                var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                    top = e.pos[1] + ( offsetElement.offsetTop || 0),
                    x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
                    y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
                    content = tooltip(e.series.key, x, y, e, chart);

                nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
            }
            ;

        //------------------------------------------------------------



        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { container.transition().call(chart); };
                // chart.container = this;

                //set state.disabled
                state.disabled = data.map(function(d) { return !!d.disabled });

                if (!defaultState) {
                    var key;
                    defaultState = {};
                    for (key in state) {
                        if (state[key] instanceof Array)
                            defaultState[key] = state[key].slice(0);
                        else
                            defaultState[key] = state[key];
                    }
                }

                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.nv-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'nvd3 nv-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.nv-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                var dataBars = data.filter(function(d) { return !d.disabled && d.bar });
                var dataLines = data.filter(function(d) { return !d.disabled && !d.bar }); // removed the !d.disabled clause here to fix Issue #240

                //x = xAxis.scale();
                // x = dataLines.filter(function(d) { return !d.disabled; }).length && dataLines.filter(function(d) { return !d.disabled; })[0].values.length ? lines.xScale() : bars.xScale();
                x = dataLines.length ? lines.xScale() : bars.xScale(); //old code before change above
                y1 = bars.yScale();
                y2 = lines.yScale();

                //------------------------------------------------------------

                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = d3.select(this).selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'nv-x nv-axis');
                gEnter.append('g').attr('class', 'nv-y1 nv-axis');
                gEnter.append('g').attr('class', 'nv-y2 nv-axis');
                gEnter.append('g').attr('class', 'nv-barsWrap');
                gEnter.append('g').attr('class', 'nv-linesWrap');
                gEnter.append('g').attr('class', 'nv-legendWrap');
                gEnter.append('g').attr('class', 'nv-interactive');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend.width( availableWidth / 2 );

                    g.select('.nv-legendWrap')
                        .datum(data.map(function(series) {
                            series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;

                            if (typeof series.metricName !== 'undefined') {
                                series.key = series.originalKey + ' (' + series.metricName + ')';
                            }
                            //series.key = series.originalKey + (series.bar ? ' (left axis)' : ' (right axis)');
                            return series;
                        }))
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;
                    }

                    g.select('.nv-legendWrap')
                        .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------
                //Set up interactive layer
                if (useInteractiveGuideline) {
                    interactiveLayer
                        .width(availableWidth)
                        .height(availableHeight)
                        .margin({left:margin.left, top:margin.top})
                        .svgContainer(container)
                        .xScale(x);
                    wrap.select(".nv-interactive").call(interactiveLayer);
                }

                //------------------------------------------------------------
                // Main Chart Component(s)


                lines
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) {
                        return !data[i].disabled && !data[i].bar
                    }))

                bars
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                        return d.color || color(d, i);
                    }).filter(function(d,i) {
                        return !data[i].disabled && data[i].bar
                    }))



                var barsWrap = g.select('.nv-barsWrap')
                    .datum(dataBars.length ? dataBars : [{values:[]}])
                    //.datum(data.filter(function(d) { return !d.disabled  && d.bar}) );

                var linesWrap = g.select('.nv-linesWrap')
                    .datum(dataLines.length ? dataLines : [{values:[]}] );
                    //.datum(data.filter(function(d) { return !d.disabled  && !d.bar}) );
                //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );

                d3.transition(barsWrap).call(bars);
                d3.transition(linesWrap).call(lines);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Axes

                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y1.range()[0] + ')');
                d3.transition(g.select('.nv-x.nv-axis'))
                    .call(xAxis);


                y1Axis
                    .scale(y1)
                    .ticks( availableHeight / 36 )
                    .tickSize(-availableWidth, 0);

                d3.transition(g.select('.nv-y1.nv-axis'))
                    .style('opacity', dataBars.length ? 1 : 0)
                    .call(y1Axis);


                y2Axis
                    .scale(y2)
                    .ticks( availableHeight / 36 )
                    .tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

                g.select('.nv-y2.nv-axis')
                    .style('opacity', dataLines.length ? 1 : 0)
                    .attr('transform', 'translate(' + availableWidth + ',0)');
                //.attr('transform', 'translate(' + x.range()[1] + ',0)');

                d3.transition(g.select('.nv-y2.nv-axis'))
                    .call(y2Axis);

                //------------------------------------------------------------


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('stateChange', function(newState) {
                    state = newState;
                    dispatch.stateChange(state);
                    chart.update();
                });

                interactiveLayer.dispatch.on('elementMousemove', function(e) {
                    lines.clearHighlights();
                    var singlePoint, pointIndex, pointXLocation, allData = [];
                    data
                        .filter(function(series, i) {
                            series.seriesIndex = i;
                            return !series.disabled;
                        })
                        .forEach(function(series,i) {
                            pointIndex = nv.interactiveBisect(series.values, e.pointXValue, chart.x());
                            lines.highlightPoint(i, pointIndex, true);
                            var point = series.values[pointIndex];
                            if (typeof point === 'undefined') return;
                            if (typeof singlePoint === 'undefined') singlePoint = point;
                            if (typeof pointXLocation === 'undefined') pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                            allData.push({
                                key: series.key,
                                value: chart.y()(point, pointIndex),
                                color: color(series,series.seriesIndex)
                            });
                        });
                    //Highlight the tooltip entry based on which point the mouse is closest to.
                    if (allData.length > 2) {
                        var yValue = chart.yScale().invert(e.mouseY);
                        var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
                        var threshold = 0.03 * domainExtent;
                        var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                        if (indexToHighlight !== null)
                            allData[indexToHighlight].highlight = true;
                    }

                    var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
                    interactiveLayer.tooltip
                        .position({left: pointXLocation + margin.left, top: e.mouseY + margin.top})
                        .chartContainer(that.parentNode)
                        .enabled(tooltips)
                        .valueFormatter(function(d,i) {
                            return y1Axis.tickFormat()(d);
                        })
                        .data(
                        {
                            value: xValue,
                            series: allData
                        }
                    )();

                    interactiveLayer.renderGuideLine(pointXLocation);

                });

                interactiveLayer.dispatch.on("elementMouseout",function(e) {
                    dispatch.tooltipHide();
                    lines.clearHighlights();
                });

                dispatch.on('tooltipShow', function(e) {
                    //if (tooltips) showTooltip(e, that.parentNode);
                });


                // Update chart from a state object passed to event handler
                dispatch.on('changeState', function(e) {

                    if (typeof e.disabled !== 'undefined') {
                        data.forEach(function(series,i) {
                            series.disabled = e.disabled[i];
                        });

                        state.disabled = e.disabled;
                    }

                    chart.update();
                });

                //============================================================


            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        lines.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        lines.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        bars.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        bars.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) nv.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.legend = legend;
        chart.lines = lines;
        chart.bars = bars;
        chart.xAxis = xAxis;
        chart.y1Axis = y1Axis;
        chart.y2Axis = y2Axis;
        chart.interactiveLayer = interactiveLayer;

        //d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate', 'interactive', 'useVoronoi');
        d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'xRange', 'yRange'
            , 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'useVoronoi','id', 'interpolate');
        //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
        //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

        chart.options = nv.utils.optionsFunc.bind(chart);

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            lines.x(_);
            bars.x(_);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = _;
            lines.y(_);
            bars.y(_);
            return chart;
        };

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = nv.utils.getColor(_);
            legend.color(color);
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.state = function(_) {
            if (!arguments.length) return state;
            state = _;
            return chart;
        };

        chart.defaultState = function(_) {
            if (!arguments.length) return defaultState;
            defaultState = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        chart.useInteractiveGuideline = function(_) {
            if(!arguments.length) return useInteractiveGuideline;
            useInteractiveGuideline = _;
            if (_ === true) {
                chart.interactive(false);
                chart.useVoronoi(false);
            }
            return chart;
        };
        //============================================================


        return chart;
    }
})();