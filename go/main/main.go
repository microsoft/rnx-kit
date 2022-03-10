package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/microsoft/rnx_kit/go/repo"
)

func main() {
	startTime := time.Now()
	args := os.Args[1:]
	var verbose bool = false
	var command string = "run"
	var task string = ""
	var target string = ""

	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch {
		case arg == "--verbose":
			verbose = true
		case arg == "--help" || arg == "-h":
			fmt.Println("Help text here")
			os.Exit(0)
		case arg == "run":
			command = arg
		case arg == "--to":
			if i < len(args)-1 {
				target = args[i+1]
				i++
			} else {
				fmt.Println("Error: --to requires a target parameter")
				os.Exit(1)
			}
		default:
			if command == "run" && task == "" {
				task = arg
			}
		}
	}

	repository, err := repo.LoadRepo("")
	if err != nil {
		fmt.Printf("Error loading repo: \n%s\n", err.Error())
		log.Fatal()
	}
	if verbose {
		fmt.Printf("found %d packages\n", len(repository.Packages))

		for _, pkg := range repository.Packages {
			fmt.Printf("%s\n", pkg.Name)
		}
	}

	if task != "" && command == "run" {
		if target != "" && repository.Packages[target] == nil {
			fmt.Println("Error: trying to build to non-existant target")
			os.Exit(1)
		}
		repository.RunTask(task, target)
	}

	duration := time.Since(startTime)
	fmt.Printf("Elapsed time: %f seconds\n", duration.Seconds())
}
