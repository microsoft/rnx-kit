package main

import (
	"fmt"
	"time"
	"github.com/microsoft/rnx_kit/lib/paths"
)

func main() {
	startTime := time.Now()
	fmt.Println("Hello, World!")
	fmt.Printf("Current working directory: %s\n", paths.Cwd())
	duration := time.Now().Sub(startTime)
	fmt.Printf("Elapsed time: %d", duration.Milliseconds())
}
