var DIFF_INTERVAL = 60000;
var bike_point_by_name = {};
var google_map = null;

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
    addBikePoints(data);
  });
}

function addBikePoints(data) {
  var prevInfoWindow = null;

  Object.keys(data).forEach(function(key) {
    var info = data[key];

    var infoWindow = new google.maps.InfoWindow({
      content: key,
      position: new google.maps.LatLng(info.lat, info.lon)
    });

    var position = {lat: info.lat, lng: info.lon};

    var circle = new google.maps.Circle({
      strokeOpacity: 0,
      fillColor: "#000000",
      fillOpacity: 0.5,
      map: google_map,
      center: position,
      radius: Math.max(info.count*5, 30),
      zIndex: 50
    });

    bike_point_by_name[key] = {
      circle: circle,
      info: info,
      position: position
    }

    circle.addListener("click", function() {
      if (prevInfoWindow != null) {
	prevInfoWindow.close();
      }

      if (prevInfoWindow == infoWindow) {
	prevInfoWindow = null;
	return;
      }

      prevInfoWindow = infoWindow;

      infoWindow.open(google_map);
    });
  });

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
      if (key in bike_point_by_name) {
	var point_update_delay = point_interval*point_index;
	var bike_point = bike_point_by_name[key];
	var delta = data[key];

	setTimeout(function() {
	  showActivityPing(delta, bike_point.position);
	}, point_update_delay);

	point_index++;
      }
    });
  });
}

function showActivityPing(delta, position) {
  var color;
  if (delta > 0) {
    color = "#00FF00";
  } else {
    color = "#FF0000";
  }

  var circle = new google.maps.Circle({
    strokeOpacity: 0,
    fillColor: color,
    fillOpacity: 1.0,
    map: google_map,
    center: position,
    radius: 150,
    zIndex: 100
  });

  var t = setInterval(function() {
    circle.set("fillOpacity", circle.get("fillOpacity")-0.02);
  }, 100);

  setTimeout(function() {
    circle.setMap(null);
    delete circle;
    clearInterval(t);
  }, 5000);
}
