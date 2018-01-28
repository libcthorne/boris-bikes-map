package main

import (
    "fmt"
    "github.com/go-redis/redis"
    "net/http"
)

var client = redis.NewClient(&redis.Options{
    Addr: "localhost:6379",
})

func create_redis_handler(key string) func (http.ResponseWriter, *http.Request) {
   return func (w http.ResponseWriter, r *http.Request) {
        val, err := client.Get(key).Result()

        w.Header().Set("Content-Type", "application/json")

        if err == nil {
            fmt.Fprintf(w, val)
        } else {
            fmt.Fprintf(w, "{}")
        }
    }
}

func main() {
    http.Handle("/", http.FileServer(http.Dir("./static")))
    http.HandleFunc("/bike_points", create_redis_handler("bike_points_map"))
    http.HandleFunc("/bike_points_diff", create_redis_handler("bike_points_diff"))
    http.ListenAndServe(":8080", nil)
}
