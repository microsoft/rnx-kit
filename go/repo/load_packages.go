package repo

import (
	"io/fs"
	"path/filepath"

	"github.com/microsoft/rnx_kit/go/configs"
	"github.com/microsoft/rnx_kit/go/paths"
)

func LoadPackages(rootPath string, globs []string, pipeline PipelineMap) (map[string]*RepoPkg, error) {
	var err error = nil

	// create a channel collection for querying results once things finish
	channel := make(chan *RepoPkg)
	numFound := 0

	// traverse the file system looking for package.json files matching the glob patterns
	paths.FindWithGlobFunc("package.json", rootPath, globs, func(path string, d fs.DirEntry) {
		numFound++
		// now start a go task to load the package info
		go loadPackageInfo(path, channel)
	})

	// now build up the map of packages for the repo by waiting on the concurrent load results
	var packages map[string]*RepoPkg = make(map[string]*RepoPkg)
	for i := 0; i < numFound; i++ {
		pkg := <-channel
		if pkg != nil && pkg.Name != "" {
			packages[pkg.Name] = pkg
		}
	}

	// link the packages together
	err = BuildDepTree(packages)

	// now build the tasks (which require linked packages and pipelines)
	for _, pkg := range packages {
		pkg.BuildTasks(pipeline)
	}

	return packages, err
}

func loadPackageInfo(path string, result chan *RepoPkg) {
	pkgJson, _ := configs.LoadPackageInfo(path)
	if pkgJson.Name != "" {
		rootPath := filepath.Dir(path)
		result <- CreateRepoPkg(rootPath, pkgJson)
	}
	result <- nil
}
