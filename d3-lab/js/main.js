//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){
    
        //variables for data join
        var attrArray = ["LACCESS_POP15", "LACCESS_WHITE15", "LACCESS_BLACK15", "LACCESS_HISP15", "LACCESS_NHASIAN15"];
        
    
    var expressed = attrArray[0]; //initial attribute
    
    //begin script when window loads
    window.onload = setMap();

    //Example 1.4 line 1...set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.75,
            height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

       //Example 2.1 line 15...create Albers equal area conic projection centered on France
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

            //translate europe TopoJSON
            var usCountry = topojson.feature(unitedstates, unitedstates.objects.UnitedStates),
                wisconsinRegion = topojson.feature(wisconsin, wisconsin.objects.WisconsinCounties).features;

            //add Europe countries to map
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
                var csvKey = csvRegion.COUNTY_NAM; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<wisconsinRegion.length; a++){

                var geojsonProps = wisconsinRegion[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.COUNTY_NAM; //the geojson primary key

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
                return "regions " + d.properties.County;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed]);
            });
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
        
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.7,
        chartHeight = 460,
        leftPadding = 40,
        rightPadding = 20,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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
        
        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([400, 0])
            .domain([0, 140000]);
        
        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
            return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.County;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed])) + topBottomPadding;
        });
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");
        console.log(expressed[3]);
        
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
        
    }; 

})(); //last line of main.js