package main

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/microsoft/rnx_kit/go/configs"
	"github.com/microsoft/rnx_kit/go/paths"
)

func main() {
	startTime := time.Now()
	fmt.Println("Hello, World!")
	fmt.Printf("Current working directory: %s\n", paths.Cwd())

	root, _ := paths.FindUpPath(".git", "")
	fmt.Printf("Root path: %s\n", root)
	fmt.Printf("Root path via repo root: %s\n", paths.FindRepoRoot())

	rootJsonPath := filepath.Join(root, "package.json")
	packageInfo, _ := configs.LoadPackageInfo(rootJsonPath)
	fmt.Println(configs.Prettify(&packageInfo))

	duration := time.Since(startTime)
	fmt.Printf("Elapsed time: %d\n", duration.Milliseconds())
}
