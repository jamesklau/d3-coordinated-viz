//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){
    
        //variables for data join
        var attrArray = ["Population with Low Access to Grocery Store", "White Population with Low Access to Grocery Store", "Black Population with Low Access to Grocery Store", "Hispanic Population with Low Access to Grocery Store", "Asian Population with Low Access to Grocery Store"];
        
    
    var expressed = attrArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.4,
        chartHeight = 400,
        leftPadding = 40,
        rightPadding = 20,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding *2 ,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([400, 0])
            .domain([0, 140000]);
    
    //begin script when window loads
    window.onload = setMap();

    //Example 1.4 line 1...set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

       //Example 2.1 line 15...create Albers equal area conic projection centered on Wisconsin
        var projection = d3.geoAlbers()
            .center([0, 44.42])
            .rotate([90.09, 0, 0])
            .parallels([27.00, 48.45])
            .scale(3179.8)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Wisconsin_Food_Access_Change.csv")); //load attributes from csv
        promises.push(d3.json("data/UnitedStates.topojson")); //load background spatial data
        promises.push(d3.json("data/WisconsinCounties.topojson")); //load choropleth spatial data
        Promise.all(promises).then(callback);

        function callback(data){
        csvData = data[0];
        unitedstates = data[1];
        wisconsin = data[2];  

            //place graticule on the map
            setGraticule(map, path);

            //translate USA TopoJSON
            var usCountry = topojson.feature(unitedstates, unitedstates.objects.UnitedStates),
                wisconsinRegion = topojson.feature(wisconsin, wisconsin.objects.WisconsinCounties).features;

            //add USA countries to map
            var countries = map.append("path")
                .datum(usCountry)
                .attr("class", "countries")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            wisconsinRegion = joinData(wisconsinRegion, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
        setEnumerationUnits(wisconsinRegion, map, path, colorScale);
            
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
            
        createDropdown();
        };
    };

    function setGraticule(map, path){
        //Example 2.6 line 1...create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };

    function joinData(wisconsinRegion){
            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.COUNTY_FIP; //the CSV primary key 

            //loop through geojson regions to find correct region
            for (var a=0; a<wisconsinRegion.length; a++){

                var geojsonProps = wisconsinRegion[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.COUNTY_FIP; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };

        return wisconsinRegion; 
    };


    //Example 1.3 line 38
    function setEnumerationUnits(wisconsinRegion, map, path, colorScale){

        //add Wisconsin regions to map
        var regions = map.selectAll(".regions")
            .data(wisconsinRegion)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions" + d.properties.COUNTY_FIP;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                console.log(d);
                highlight(d.properties);
                setLabel(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
            
            //below Example 2.2 line 16...add style descriptor to each path
            var desc = regions.append("desc")
                .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    };

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };  


    //Example 2.1 line 11...function to create coordinated bar chart
    function setChart(csvData, colorScale){
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
            //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 115)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed);
        
        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars" + d.COUNTY_FIP;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(d){
                //console.log(d);
                highlight(d);
                setLabel(d);
            })
            .on("mouseout", function(d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
        
            //below Example 2.2 line 31...add style descriptor to each rect
            var desc = bars.append("desc")
                .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
        
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
        
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
            //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale, chart);
    };
    
    //function to create a dropdown menu for attribute selection
function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
    
    //dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //Example 1.5 line 9...recolor enumeration units
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(10)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
    //Example 1.7 line 22...re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);

};
    
    //function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
        //console.log(parseFloat(d[expressed]));
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    var chartTitle = d3.select(".chartTitle")
        .text(expressed);
}; 

//Example 2.8 line 1...function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
    
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll(".regions" + props.COUNTY_FIP)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    var selected1 = d3.selectAll(".bars" + props.COUNTY_FIP)
        .style("stroke", "blue")
        .style("stroke-width", "2");
};
    
//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll(".regions" + props.COUNTY_FIP)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        var selected1 = d3.selectAll(".bars" + props.COUNTY_FIP)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    //below Example 2.4 line 21...remove info label
    d3.select(".infolabel")
        .remove();
    
};
    
//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.FIPS + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};
 
})(); //last line of main.js