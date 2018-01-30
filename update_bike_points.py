#! /usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
import sys
import time

import redis
import requests

APP_ID = os.environ.get("APP_ID")
APP_KEY = os.environ.get("APP_KEY")
REQUEST_INTERVAL_SECONDS = 60

r = redis.StrictRedis()

def get_bike_points_map():
    response = requests.get(
        "https://api.tfl.gov.uk/BikePoint?app_id={}&app_key={}".format(
    	    APP_ID, APP_KEY))

    if response.status_code != 200:
        print("Error requesting data: {}".format(
            response.text))
        return None

    if not response.headers["Content-Type"].startswith("application/json"):
        print("Unexpected content type: {}".format(
            response.headers["Content-Type"]))
        return None

    bike_points = response.json()
    bike_points_map = {}

    for bike_point in bike_points:
        additional_properties = bike_point["additionalProperties"]
        point_name = bike_point["commonName"]
        bikes_count = None
        for additional_property in additional_properties:
            key = additional_property["key"]
            if key == "NbBikes":
                bikes_count = int(additional_property["value"])

        bike_points_map[point_name] = {
            "lat": bike_point["lat"],
            "lon": bike_point["lon"],
            "count": bikes_count,
        }

    return bike_points_map

prev_bike_points_map = json.loads(r.get("bike_points_map")) or {}
while True:
    bike_points_map = get_bike_points_map()
    bike_points_diff = {}

    if bike_points_map is not None:
        saw_new_data = False

        for bike_point_name, info in bike_points_map.items():
            count = info["count"]
            if bike_point_name in prev_bike_points_map:
                prev_count = prev_bike_points_map[bike_point_name]["count"]
                delta = count - prev_count
                if delta != 0:
                    print("delta of %s seen at %s" % (delta, bike_point_name))
                    saw_new_data = True
                    bike_points_diff[bike_point_name] = delta
            else:
                print("%s bikes at %s" % (count, bike_point_name))
                saw_new_data = True

        if saw_new_data:
            r.set("bike_points_map", json.dumps(bike_points_map))
            r.set("prev_bike_points_map", json.dumps(prev_bike_points_map))
        else:
            print("No change seen")

        prev_bike_points_map = bike_points_map

    time.sleep(REQUEST_INTERVAL_SECONDS)
