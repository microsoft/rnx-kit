package main

import (
	"fmt"
	"log"
	"time"

	"github.com/microsoft/rnx_kit/go/repo"
)

func main() {
	startTime := time.Now()

	repository, err := repo.LoadRepo("")
	if err != nil {
		fmt.Printf("Error loading repo: \n%s\n", err.Error())
		log.Fatal()
	}
	fmt.Printf("found %d packages\n", len(repository.Packages))

	for _, pkg := range repository.Packages {
		fmt.Printf("%s\n", pkg.Name)
	}

	fmt.Println("Starting simulated build:")
	repository.RunTask("build", "")

	duration := time.Since(startTime)
	fmt.Printf("Elapsed time: %f seconds\n", duration.Seconds())
}
