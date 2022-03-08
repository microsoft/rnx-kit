package repo

import (
	"io/fs"
	"path/filepath"

	"github.com/microsoft/rnx_kit/go/configs"
	"github.com/microsoft/rnx_kit/go/paths"
)

func LoadPackages(rootPath string, globs []string) (map[string]*RepoPkg, error) {
	var err error = nil

	// create a channel collection for querying results once things finish
	var channels []chan *RepoPkg

	// traverse the file system looking for package.json files matching the glob patterns
	paths.FindWithGlobFunc("package.json", rootPath, globs, func(path string, d fs.DirEntry) {
		// create the channel for this return result and add it to the list
		channel := make(chan *RepoPkg)
		channels = append(channels, channel)
		// now start a go task to load the package info
		go loadPackageInfo(path, channel)
	})

	// now build up the map of packages for the repo by waiting on the concurrent load results
	var packages map[string]*RepoPkg = make(map[string]*RepoPkg)
	for _, result := range channels {
		pkg := <-result
		if pkg != nil {
			packages[pkg.Name()] = pkg
		}
	}

	// link the packages together
	err = BuildDepTree(packages)

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
