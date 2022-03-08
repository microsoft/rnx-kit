package main

import (
	"fmt"
	"log"
	"time"

	"github.com/microsoft/rnx_kit/go/repo"
)

func main() {
	startTime := time.Now()

	repo, err := repo.LoadRepo("")
	if err != nil {
		fmt.Printf("Error loading repo: \n%s\n", err.Error())
		log.Fatal()
	}
	fmt.Printf("found %d packages\n", len(repo.Packages))

	for _, pkg := range repo.Packages {
		fmt.Printf("%s\n", pkg.Name())
		for _, depPkg := range pkg.Deps {
			fmt.Printf(" - %s\n", depPkg.Name())
		}
	}

	duration := time.Since(startTime)
	fmt.Printf("Elapsed time: %d\n", duration.Milliseconds())
}
