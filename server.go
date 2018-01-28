package main

import (
    "fmt"
    "github.com/go-redis/redis"
    "net/http"
)

var client = redis.NewClient(&redis.Options{
    Addr: "localhost:6379",
})

func counts_handler(w http.ResponseWriter, r *http.Request) {
    val, err := client.Get("bike_point_counts").Result()

    w.Header().Set("Content-Type", "application/json")

    if err == nil {
        fmt.Fprintf(w, val)
    } else {
	fmt.Fprintf(w, "{}")
    }
}

func main() {
    http.Handle("/", http.FileServer(http.Dir("./static")))
    http.HandleFunc("/counts", counts_handler)
    http.ListenAndServe(":8080", nil)
}
