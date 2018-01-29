var DIFF_INTERVAL = 60000;
var markers_by_name = {};

function initMap() {
  var london_pos = {lat: 51.515, lng: -0.141};

  google_map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: london_pos
  });

  populateMap();
}

function populateMap() {
  fetch("/bike_points")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    addBikePointMarkers(data);
  });
}

function addBikePointMarkers(data) {
  var prevInfoWindow = null;
  var markers = [];

  Object.keys(data).forEach(function(key) {
    var info = data[key];

    var infoWindow = new google.maps.InfoWindow({
      content: key
    });

    var marker = new MarkerWithLabel({
      position: {lat: info.lat, lng: info.lon},
      /*labelContent: info.count,
      labelAnchor: new google.maps.Point(10, 25),
      labelClass: "bike-count-label",*/
      icon: "cycling.png"
    });

    markers_by_name[key] = marker;

    marker.addListener("click", function() {
      if (prevInfoWindow != null) {
	prevInfoWindow.close();
      }

      if (prevInfoWindow == infoWindow) {
	prevInfoWindow = null;
	return;
      }

      prevInfoWindow = infoWindow;

      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });

  var markerCluster = new MarkerClusterer(google_map, markers,
    {
      styles: [{
	height: 32,
	url: "cycling.png",
	width: 32,
	textColor: "#00000000"
      }],
      gridSize: 50
    }
  );

  renderDiff();
  setInterval(renderDiff, DIFF_INTERVAL);
}

function renderDiff() {
  fetch("/bike_points_diff")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    var keys = Object.keys(data);

    var point_interval = DIFF_INTERVAL/keys.length;
    var point_index = 0;

    keys.forEach(function(key) {
      if (key in markers_by_name) {
	var point_ping_delay = point_interval*point_index;

	setTimeout(function() {
	  showMarkerPing(markers_by_name[key]);
	}, point_ping_delay);

	point_index++;
      }
    });
  });
		  }

function showMarkerPing(marker) {
  var circle = new google.maps.Circle({
    strokeOpacity: 0,
    fillColor: "#FF0000",
    fillOpacity: 0.5,
    map: google_map,
    center: marker.getPosition(),
    radius: 100
  });

  var t = setInterval(function() {
    circle.set("fillOpacity", circle.get("fillOpacity")-0.01);
  }, 100);

  setTimeout(function() {
    circle.setMap(null);
    delete circle;
    clearInterval(t);
  }, 5000);
}
