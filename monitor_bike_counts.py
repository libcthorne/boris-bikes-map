#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time

import requests

APP_ID = os.environ.get("APP_ID")
APP_KEY = os.environ.get("APP_KEY")
REQUEST_INTERVAL_SECONDS = 60

def get_bike_point_counts():
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
    bike_point_counts = {}

    for bike_point in bike_points:
        additional_properties = bike_point["additionalProperties"]
        point_name = bike_point["commonName"]
        bikes_count = None
        for additional_property in additional_properties:
            key = additional_property["key"]
            if key == "NbBikes":
                bikes_count = int(additional_property["value"])

        bike_point_counts[point_name] = bikes_count

    return bike_point_counts

prev_bike_point_counts = {}
while True:
    bike_point_counts = get_bike_point_counts()

    if bike_point_counts is not None:
        saw_new_data = False

        for bike_point_name, count in bike_point_counts.items():
            if bike_point_name in prev_bike_point_counts:
                prev_count = prev_bike_point_counts[bike_point_name]
                delta = count - prev_count
                if delta != 0:
                    print("delta of %s seen at %s" % (delta, bike_point_name))
                    saw_new_data = True
            else:
                print("%s bikes at %s" % (count, bike_point_name))
                saw_new_data = True

        if not saw_new_data:
            print("No change seen")

        prev_bike_point_counts = bike_point_counts

    time.sleep(REQUEST_INTERVAL_SECONDS)
