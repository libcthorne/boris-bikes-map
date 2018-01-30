var LONDON_CENTER = {lat: 51.515, lng: -0.141};
var DEFAULT_ZOOM = 12;
var UPDATE_INTERVAL = 60000;
var DOCK_POINT_COLOR = "#000000";
var BIKE_INCREASE_COLOR = "#00FF00";
var BIKE_DECREASE_COLOR = "#FF0000";

var bike_point_by_name = {};
var google_map = null;

function initMap() {
  google_map = new google.maps.Map(document.getElementById('map'), {
    zoom: DEFAULT_ZOOM,
    center: LONDON_CENTER
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
  var prev_info_window = null;

  Object.keys(data).forEach(function(key) {
    var info = data[key];

    var info_window = new google.maps.InfoWindow({
      content: key,
      position: new google.maps.LatLng(info.lat, info.lon)
    });

    var position = {lat: info.lat, lng: info.lon};

    var circle = new google.maps.Circle({
      strokeOpacity: 0,
      fillColor: DOCK_POINT_COLOR,
      fillOpacity: 0.5,
      map: google_map,
      center: position,
      radius: getRadiusForBikeCount(info.count),
      zIndex: 50
    });

    bike_point_by_name[key] = {
      count: info.count,
      circle: circle,
      info: info,
      position: position
    }

    circle.addListener("click", function() {
      if (prev_info_window != null) {
	prev_info_window.close();
      }

      if (prev_info_window == info_window) {
	prev_info_window = null;
	return;
      }

      prev_info_window = info_window;

      info_window.open(google_map);
    });
  });

  updateBikePoints();
  setInterval(updateBikePoints, UPDATE_INTERVAL);
}

function updateBikePoints() {
  fetch("/bike_points_diff")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    var keys = Object.keys(data);

    var point_interval = UPDATE_INTERVAL/keys.length;
    var point_index = 0;

    keys.forEach(function(key) {
      if (key in bike_point_by_name) {
	var point_update_delay = point_interval*point_index;
	var bike_point = bike_point_by_name[key];
	var delta = data[key];

	setTimeout(function() {
	  applyBikePointDelta(bike_point, delta);
	}, point_update_delay);

	point_index++;
      }
    });
  });
}

function applyBikePointDelta(bike_point, delta) {
  showActivityCircle(bike_point.position, delta);

  bike_point.count = Math.max(bike_point.count+delta, 0);

  bike_point.circle.setRadius(
    getRadiusForBikeCount(bike_point.count)
  );
}

function showActivityCircle(position, delta) {
  var color;
  if (delta > 0) {
    color = BIKE_INCREASE_COLOR;
  } else {
    color = BIKE_DECREASE_COLOR;
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

function getRadiusForBikeCount(bike_count) {
  return Math.max(bike_count*5, 30);
}
