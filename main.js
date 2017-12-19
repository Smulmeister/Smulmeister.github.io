// Setup scatterplot globals
var viewWidth = document.getElementById('scattercontainer').offsetWidth - 20;
var viewHeight = document.getElementById('scattercontainer').offsetHeight;
var margin = {top: 10, right: 45, bottom: 30, left: 65};
var width = viewWidth - margin.left - margin.right;
var height = viewHeight - margin.top - margin.bottom;
var x = d3.scaleLinear().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);
var colors = ["#7fcdbb", "#081d58"];
var color = d3.scaleLinear().range(colors);
var xAxis = d3.axisBottom().scale(x);
var yAxis = d3.axisLeft().scale(y);

// Attach scatterplot to div object
var svgScatter = d3.select("#scatterplot")
  .append("svg")
    .attr("width", viewWidth + margin.left + margin.right)
    .attr("height", viewHeight + margin.top + margin.bottom) 
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
// Attach legend to scatterplot
var defs = svgScatter.append( "defs" );
var legendGradient = defs.append( "linearGradient" )
    .attr( "id", "legendGradient" )
    .attr( "x1", "0" )
    .attr( "x2", "0" )
    .attr( "y1", "1" )
    .attr( "y2", "0" );

legendGradient.append( "stop" )
    .attr( "id", "gradientStart" )
    .attr( "offset", "0%" )
    .style( "stop-opacity", 1);

legendGradient.append( "stop" )
    .attr( "id", "gradientStop" )
    .attr( "offset", "100%" )
    .style( "stop-opacity", 1);

// Setup the world map svg variables
var mapWidth = document.getElementById('input').offsetWidth;
var mapHeight = document.getElementById('input').offsetHeight - 320;
var mapmargin = {top: 10, right: 10, bottom: 10, left: 40};
var mwidth = mapWidth - margin.left - margin.right;
var mheight = mapHeight - margin.top - margin.bottom;

// Attach svg to map div object
var svgMap = d3.select("#map")
.append("svg")
  .attr("height", mapHeight)
  .attr("width", mapWidth)
  .call(d3.zoom().scaleExtent([1,2])
  .on("zoom", zoomOnMap))
.append("g")
  .attr("transform", "translate(" + mapmargin.left + "," + mapmargin.top + ")");

// Create the right projection of the map
var projection = d3.geoMercator()
  .translate([mwidth / 2, mheight / 1.35])
  .scale(72)
var path = d3.geoPath()
  .projection(projection)

// Set tooltip offset variables and attach tooltip div
var offsetL = document.getElementById('map').offsetLeft;
var offsetT = document.getElementById('map').offsetTop+80;

var tooltip = d3.select("#map")
  .append("div")
  .attr("class", "tooltip hidden");

// Declare global variables
var points;
var xValue = "budget";
var yValue = "vote_count";
var colorValue = "vote_average";
var all_movies = {}
var selected_movies = {}
var duration_range = "100, 260"
var year_range = "1945, 2017"
var revenue_range = "708000000, 2781505847"
var imdb_score_range = "4, 9"
var max_revenue, max_duration, min_year, max_year
var movies_countries = {}
var world_data;
var clicked = false;
var formatTime = d3.timeFormat("%d-%m-%Y");
var parseDate = d3.timeParse("%d-%m-%Y");

// Load the needed files
d3.queue()
  .defer(d3.json, 'world-countries.json') // Map of the world
  .defer(d3.json, "movies_json.json") // The movie dataset
  .await(initialize)

function initialize (error, world, data) {
  console.log("Started: Data loaded!")

  // Set (and calculate) the right global variable values
  all_movies = data
  world_data = world
  max_revenue = Math.max.apply(Math,all_movies.map(function(o){return o.revenue;}))
  max_duration = Math.max.apply(Math,all_movies.map(function(o){return o.runtime;}))
  min_year = Math.min.apply(Math,all_movies.map(function(o){return o.year;}))
  max_year = Math.max.apply(Math,all_movies.map(function(o){return o.year;}))

  // Make the sliders for user input
  makeSliders()
  
  // Split the slider variables to be used
  var duration_vars = duration_range.split(',')
  var year_vars = year_range.split(',')
  var revenue_vars = revenue_range.split(',')
  var score_vars = imdb_score_range.split(',')
  
  // Create selection based on initial values
  selected_movies = filterData(all_movies, duration_vars[0], duration_vars[1], year_vars[0], year_vars[1], revenue_vars[0], revenue_vars[1], score_vars[0], score_vars[1])

  // Draw initial scatterplot, worldmap, heatmap and info section
  drawScatterplot(xValue, yValue, colorValue, selected_movies )

  displayInfo(selected_movies[0])

  createWorldMap(world, selected_movies)

  drawHeatmap(selected_movies)
  
}

// Function to select all movies in the dataset and visualize them
function selectAllMovies(){
  console.log("Select all data")
  selected_movies = all_movies

  drawScatterplot(xValue, yValue, colorValue, selected_movies)

  displayInfo(selected_movies[0])

  clicked = false
  createWorldMap(world_data, selected_movies)

  drawHeatmap(selected_movies)
}

function updateData(){
  console.log("Update data")
  // Split the slider variables to be used
  var duration_vars = duration_range.split(',')
  var year_vars = year_range.split(',')
  var revenue_vars = revenue_range.split(',')
  var score_vars = imdb_score_range.split(',')  

  // Create a new selection based on user input 
  console.log("Create a new selection based on: " + duration_vars[0] + " - " + duration_vars[1], year_vars[0]  + " - " +  year_vars[1], revenue_vars[0]  + " - " +  revenue_vars[1])
  selected_movies = filterData(all_movies, duration_vars[0], duration_vars[1], year_vars[0], year_vars[1], revenue_vars[0], revenue_vars[1], score_vars[0], score_vars[1])
  
  // Check if selection is not empty
  if (selected_movies.length == 0) {
    alert("Data selection contains no movies! Please select different filter values");
  } 
  else {
    console.log("New dataset has " + selected_movies.length + " data items")

    // Draw new scatterplot, worldmap and heatmap, and update info section
    drawScatterplot(xValue, yValue, colorValue,selected_movies)

    displayInfo(selected_movies[0])

    clicked = false
    createWorldMap(world_data, selected_movies)

    drawHeatmap(selected_movies)
  }
}

// Function to filter the data
function filterData(movies, dur_min, dur_max, year_min, year_max, rev_min, rev_max, score_min, score_max) {
  var filteredMovies = movies.filter(function(d){
    return d.runtime >= dur_min && 
           d.runtime <= dur_max && 
           d.year >= year_min && 
           d.year <= year_max && 
           d.revenue >= rev_min && 
           d.revenue <= rev_max &&
           d.vote_average >= score_min &&
           d.vote_average <= score_max
  })
  return filteredMovies
}

// Function to create the worldmap
function createWorldMap(world, movies) {
    console.log("Drawing worldmap!")

    // Remove old data
    svgMap.selectAll("path").remove() 

    // Create the map from topojson data
    var countries = topojson.feature(world, world.objects.countries1).features
  
    // Get the movie data to be right form   
    movies_countries = countCountries(movies)
    
    // Set coloring of values 
    max_count = Math.max.apply(Math,Object.values(movies_countries).map(function(o){return o.count;}))
    average = getAverage(Object.values(movies_countries))
    var country_color = d3.scalePow()
      .exponent(0.11)
      .domain([0, average, max_count])
      .range(["#ffffff", "#7fcdbb", "#081d58"]);
  
    // Make the map and add data with fill and text attributes
    svgMap.selectAll(".country")
      .data(countries)
      .enter().append("path")
      .attr("class", "country")
      .attr("d", path)
      .style("fill", function(d){
        return country_color(getCountryValue(d))
      })
      .on("mouseon", showTooltip)
      .on("mousemove", showTooltip)
      .on("mouseout",  hideTooltip) 
      .on("click", clickOnMap)
}

// Click mouse event function creates a new filter and updates visualizations accordingly
function clickOnMap(d){
  if (clicked == false) {
    old_selection = selected_movies
    selected_movies = selectCountry(d)
    clicked = true
  } 
  else {
    selected_movies = old_selection
    selected_movies = selectCountry(d)
  }
  drawScatterplot(xValue, yValue, colorValue, selected_movies)

  drawHeatmap(selected_movies)

  displayInfo(selected_movies[0])
}

// Function to zoom on the map
function zoomOnMap() {
  svgMap.attr("transform", d3.event.transform);
}

// Function to create a filter on the dataset based on a country
function selectCountry(d) {
  var country_selection = selected_movies.filter(function(e){
    return e.production_countries == d.properties.name
    })
  return country_selection
}

// Get the average value of country counts, to set the right colour value
function getAverage(counts) {
  var total = 0
  var rows = 0
  var max = 0
  counts.forEach(function(r) {
    if (r.count > max) {
      max = r.count
    }
    total = total + r.count 
    rows = rows + 1;
  })
  if (rows == 1) {
    return 1;
  } else {
    var average = Math.floor((total - max) / (rows - 1))
    console.log(average)
    return average;
  }
}
  
// Helper function to get the number of movies made in a country
function getCountryValue(d) {
  var value = 0
  if (typeof movies_countries[d.properties.name] !== "undefined") {
      value = movies_countries[d.properties.name].count}
  return value
}

// Mouse event exit, so to hide the tooltip
function hideTooltip(d) {
  tooltip.classed("hidden", true)
  tooltip.attr("style", "opacity:0")
  d3.select(this)
    .transition()
    .duration(100)
    .style("stroke-width", "0.5");
}

// Function to let the tooltip follow mouse movements
function showTooltip(d) {
  label = d.properties.name + " : " + getCountryValue(d);
  var mouse = d3.mouse(svgMap.node())
    .map( function(d) { return parseInt(d); } );
  tooltip.classed("hidden", false)
    .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px;font-family:Arial;font-size:0.8em")
    .html(label);
  d3.select(this)
    .transition()
    .duration(100)
    .style("stroke-width", "0.8")
  }

// Helper function to count the number of movies made in each country based on dataset
function countCountries(rows) {
  var counts = {};
  rows.forEach(function(r) {
      var key = r.production_countries
      if (!counts[key]) {
          counts[key] = {
            country: r.production_countries,
            count: 0
          };
        }
      counts[key].count++;
    }
  );
  return counts;
}

// Function to draw the scatterplot
function drawScatterplot(v1, v2 ,v3, selectMovie) {

  // Set the right values for the axis and colour
  var xExtent = d3.extent(selectMovie, function(d) { return d[v1]; });
  var yExtent = d3.extent(selectMovie, function(d) { return d[v2]; });
  var zExtent = d3.extent(selectMovie, function(d) { return d[v3];});

  x.domain(xExtent).nice();
  y.domain(yExtent).nice();
  color.domain(zExtent);

  // Remove plot before entering the new ones
  svgScatter.selectAll("g").remove()

  // Add x-axis to the scatterplot
  svgScatter.append("g")
      .attr("id", "xAxis")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("id", "xLabel")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .style('fill', 'Black')
      .text(dataName(v1));

  // Add y-axis to the scatterplot
  svgScatter.append("g")
      .attr("id", "yAxis")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("id", "yLabel")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style('fill', 'Black')
      .text(dataName(v2));

  // Add the tooltip container to the vis container
  // it's invisible and it's position/contents are defined during mouseover
  var scattertooltip = d3.select("#scatterplot")
    .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // Tooltip mouseover event handler
  var tipMouseover = function(d) {
    var html  = 
        "<span style='color:" + color(d[v3]) + ";'><b>" + d.original_title + "</b></span><br/>" +
        "Year: <b>" + d.year + "</b> , Genre: <b/>" + d.genre_main + "</b> ";
        scattertooltip.html(html)
      .style("left", (d3.event.pageX - 500) + "px")
      .style("top", (d3.event.pageY + 20) + "px")
      .transition()
        .duration(200)
        .style("opacity", .9) 
  };

  // Tooltip mouseout event handler
  var tipMouseout = function(d) {
    scattertooltip.transition()
          .duration(300)
          .style("opacity", 0); 
  };

  // Add the points to the scatterplot
  points = svgScatter.append("g")
          .attr("class", "plotArea")
          .data(selectMovie);

  // Create a small intro transition
  var transition = d3.transition()
    .duration(3000)
    .ease(d3.easeExp);

  // add the points to the scatterplot
  points.selectAll(".dot")
      .data(selectMovie)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 4)
      .transition(transition)
      .attr("cx", function(d) {
        return x(d[v1]); })
      .attr("cy", function(d) { 
        return y(d[v2]); })
      .style("fill", function(d) { return color(d[v3]); })
    
  points.selectAll(".dot")
      .data(selectMovie)  
      .on("mouseover", tipMouseover)
      .on("mouseout", tipMouseout)
      .on("click", function(d){
        displayInfo(d)
      });


  // Gradient scale in top right
  svgScatter.select("#gradientStart")
    .style("stop-color", colors[0]);
  svgScatter.select("#gradientStop")
    .style("stop-color", colors[1]);

  var legend = svgScatter.append("g")
      .attr("class", "legend");

  legend.append("rect")
      .attr("x", width)
      .attr("width", 18)
      .attr("height", 72)
      .style("fill", "url(#legendGradient)");

  legend.append("text")
      .attr("x", width - 5)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text("high");

  legend.append("text")
      .attr("x", width - 5)
      .attr("y", 66)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text("low");

  legend.append("text")
      .attr("id", "colorLabel")
      .attr("x", width + 15)
      .attr("y", 82)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(dataName(v3));
}

// Function to update the sidebar with selected movie information
function displayInfo(movie){
  // Calculate profit
  var profit = movie['revenue'] - movie['budget']

  // Append info the HTML page, first display the poster
  var image = document.createElement("img");
    image.setAttribute("src", movie['poster']);
    image.setAttribute("height", "40%");
    image.setAttribute("width", "40%");

    // Remove old image
    var old_image = document.getElementById("poster").childNodes[0]
    if (old_image == null) {
      document.getElementById("poster").appendChild(image);
    } else{
      document.getElementById("poster").replaceChild(image, old_image);      
    }
  
  // Header info
  d3.select('#movieTitle').html("") // Remove old title first
  d3.select('#movieTitle')
    .append("a")
    .attr("href", "http://www.imdb.com/title/" + movie['imdb_id'] + "/")
    .html(movie['title'] + " (" + movie['year'] + ")"); // Create hyperlink to IMDB
  d3.select('#movieTagline').text(movie['tagline']);
  d3.select('#movieOverview').text(movie['overview']);

  // Table info
  d3.select('#tableDirector').text(movie['director']);
  d3.select('#tableReleasedate').text(movie['release_date']);
  d3.select('#tableCompany').text(movie['production_companies']);
  d3.select('#tableCountry').text(movie['production_countries']);
  d3.select('#tableCastCrew').text(movie['cast'] + " / " + movie['crew']);
  d3.select('#tableRuntime').text(movie['runtime']);
  d3.select('#tableGenres').text(movie['genre_list']);
  d3.select('#tableLanguage').text(movie['spoken_languages']);
  d3.select('#tableBudget').text(accounting.formatMoney(movie['budget'], "$", 0, "."));
  d3.select('#tableRevenue').text(accounting.formatMoney(movie['revenue'], "$", 0, "."));
  // Make losses displayed in red, otherwise black
  d3.select('#tableProfit').text(accounting.formatMoney(profit, "$", 0, "."))
    .classed("loss", function(d){
      if (profit < 0) {return true}
    })
  // Round averages to 2 decimals
  d3.select('#tablePopularity').text(movie['TMDB_popularity'].toFixed(1));
  d3.select('#tableVote').text(movie['vote_average'].toFixed(1));
  d3.select('#tableVotes').text(movie['vote_count']);

}

// Display the name of variable on the scatterplot axis. Display error if name is unknown
function dataName(v) {
  if( v == "budget")
    return "Budget";
  else if( v == "vote_count")
    return "Vote count";
  else if( v == "TMDB_popularity")
    return "Popularity";
  else if( v == "revenue")
    return "Revenue ";
  else if( v == "runtime")
    return "Runtime ";
  else if( v == "crew")
    return "Number of crew members";
  else if( v == "cast")
    return "Number of cast members";
  else if( v == "vote_average")
    return "Vote average";
  else ( v == "a")
    return "Error";
}

// Function to update the scatterplot axis values
function selectVariable(id) {
  var variable;

  if(id == 0) {
    var e = document.getElementById("xAxisItem");
    xValue = e.options[e.selectedIndex].value;
  }
  else if(id == 1) {
    var e = document.getElementById("yAxisItem");
    yValue = e.options[e.selectedIndex].value;
  }
  else if(id == 2) {
    var e = document.getElementById("colorItem");
    colorValue = e.options[e.selectedIndex].value;
  }
}

// Create the input sliders and set relevant starting values
function makeSliders() {
  var dur_slider = new rSlider({
    target: '#slider1',
    values: {min: 0, max: max_duration},
    step: 10,
    scale: true,
    range: true,
    tooltip: true, 
    set: [100, 260],
    labels: false,
    onChange: function (vals) {
      duration_range = vals }
});              

var year_slider = new rSlider({
    target: '#slider2',
    values:  {min: min_year, max: max_year},
    step: 2,
    range: true,
    scale: true,
    set: [1945, 2017],
    tooltip: true,
    labels: false,
    onChange: function (vals) {
      year_range = vals;
      }
    });

var revenue_slider = new rSlider({
    target: '#slider3',
    values: {min: 0, max: max_revenue},
    step: 12000000,
    range: true,
    set: [708000000, max_revenue],
    scale: true,
    labels: false,
    onChange: function (vals) {
      revenue_range = vals;  
      }
    });

var score_slider = new rSlider({
  target: '#slider4',
  values: {min: 0, max: 10},
  step: 0.5,
  range: true,
  set: [4, 9],
  scale: true,
  labels: false,
  onChange: function (vals) {
    imdb_score_range = vals;
    }
  });
}

// The heatmap creation function
function drawHeatmap(movies){
  console.log("Drawing the heatmap")

  // Count the number of movies per date
  movies_heatmap = countDates(movies)

  // Set the right date variables
  var now = moment().endOf('day').toDate();
  var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
  var chartData = d3.timeDays(yearAgo, now).map(function (s) {
    var value = 0;
    if (movies_heatmap[s] != undefined){
      value = movies_heatmap[s].count;
    }
    return {
      date: s,
      count:value 
    };
  });

  // Create the actual heatmap based on the created data
  var heatmap = calendarHeatmapMini()
    .data(chartData)
    .selector('#heatmap')
    .colorRange(['#7fcdbb', '#081d58'])
    .tooltipEnabled(true)
    .legendEnabled(true)
    .onClick(function (data) {
        var clickedMovies = [];
        var clickedDate = formatTime(data.date)
        var splitClickedDate = (formatTime(data.date)).split("-")
        movies.forEach(function(r){
          var split = r.release_date.split("/");
          if( split[0] == splitClickedDate[0]){
            if(split[1] == splitClickedDate[1]){ 
              clickedMovies.push(r)
            }
          }
        });
        selected_movies = clickedMovies

        drawScatterplot(xValue,yValue,colorValue, selected_movies)

        createWorldMap(world_data, selected_movies)

        displayInfo(selected_movies[0])
    });
  heatmap();
}

// Helper function to count the number of movies per date
function countDates(rows) {
  var counts = {};
  var newDates = [];
  var tempDate = "";
  var now = formatTime(moment().endOf('day').toDate()).split("-");

  // Iterate over all items to parse the release date without year
  rows.forEach(function(r){
    var date = r.release_date
    var split = date.split("/");
      if(split[0] >= now[0]){
        if(split[1] >= now[1]){
          tempDate = split[0]+ "-" + split[1]+ "-"+ (parseInt(now[2])-1).toString();
        }else{
          tempDate = split[0]+ "-" + split[1]+ "-"+ now[2];
        }
      }else{
        tempDate = split[0]+ "-" + split[1]+ "-" + now[2];
      }
    newDates.push(tempDate);  
  })
  newDates.forEach(function(r) {

      var key = parseDate(r);
      if (!counts[key]) {
          counts[key] = {
            date: r,
            count: 0
          };
        }
      counts[key].count++;
    }
  );
  return counts;
}