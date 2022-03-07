package main

import (
	"fmt"
	"time"

	"github.com/microsoft/rnx_kit/go/repo"
)

func main() {
	startTime := time.Now()

	repo := repo.LoadRepo("")
	fmt.Printf("found %d packages\n", len(repo.Packages))

	for _, pkg := range repo.Packages {
		fmt.Printf("Loading package %s\n", pkg.Name)
	}

	duration := time.Since(startTime)
	fmt.Printf("Elapsed time: %d\n", duration.Milliseconds())
}
