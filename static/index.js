var LONDON_CENTER = {lat: 51.515, lng: -0.141};
var DEFAULT_ZOOM = 12;
var UPDATE_INTERVAL = 60000;
var DOCK_POINT_COLOR = "#000000";
var BIKE_INCREASE_COLOR = "#00FF00";
var BIKE_DECREASE_COLOR = "#FF0000";

var bike_point_by_name = {};
var google_map = null;
var prev_info_window = null;

function initMap() {
  google_map = new google.maps.Map(document.getElementById('map'), {
    zoom: DEFAULT_ZOOM,
    center: LONDON_CENTER
  });

  populateMap();
}

function populateMap() {
  fetch("/prev_bike_points")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    addBikePoints(data);
  });
}

function addBikePoints(bike_points) {
  Object.keys(bike_points).forEach(function(bike_point_name) {
    var info = bike_points[bike_point_name];
    addBikePoint(bike_point_name, info);
  });

  updateBikePoints();
  setInterval(updateBikePoints, UPDATE_INTERVAL);
}

function addBikePoint(bike_point_name, info) {
  var info_window = new google.maps.InfoWindow({
    content: bike_point_name,
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

  bike_point_by_name[bike_point_name] = {
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
}

function updateBikePoints() {
  fetch("/bike_points")
  .then(function(response) {
    return response.json();
  })
  .then(function(bike_points) {
    var deltas = calculateBikePointDeltas(bike_points);
    var keys = Object.keys(deltas);

    var point_interval = UPDATE_INTERVAL/keys.length;
    var point_index = 0;

    keys.forEach(function(bike_point_name) {
      if (bike_point_name in bike_point_by_name) {
	var point_update_delay = point_interval*point_index;
	var bike_point = bike_point_by_name[bike_point_name];
	var delta = deltas[bike_point_name];

	setTimeout(function() {
	  applyBikePointDelta(bike_point, delta);
	}, point_update_delay);

	point_index++;
      } else {
	addBikePoint(bike_point_name, bike_points[bike_point_name]);
      }
    });
  });
}

function calculateBikePointDeltas(new_bike_points) {
  var deltas = {};

  Object.keys(new_bike_points).forEach(function(bike_point_name) {
    if (bike_point_name in bike_point_by_name) {
      var old_info = bike_point_by_name[bike_point_name].info;
      var new_info = new_bike_points[bike_point_name];
      var delta = new_info.count - old_info.count

      if (delta != 0) {
	deltas[bike_point_name] = delta;
      }
    } else {
      deltas[bike_point_name] = delta;
    }
  });

  return deltas;
}

function applyBikePointDelta(bike_point, delta) {
  showActivityCircle(bike_point.position, delta);

  bike_point.info.count += delta;

  bike_point.circle.setRadius(
    getRadiusForBikeCount(bike_point.info.count)
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
