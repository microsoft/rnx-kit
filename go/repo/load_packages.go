package repo

import (
	"io/fs"

	"github.com/microsoft/rnx_kit/go/configs"
	"github.com/microsoft/rnx_kit/go/paths"
)

func LoadPackages(rootPath string, globs []string) map[string]*configs.PackageInfo {
	// create a channel collection for querying results once things finish
	var channels []chan *configs.PackageInfo

	// traverse the file system looking for package.json files matching the glob patterns
	paths.FindWithGlobFunc("package.json", rootPath, globs, func(path string, d fs.DirEntry) {
		// create the channel for this return result and add it to the list
		channel := make(chan *configs.PackageInfo)
		channels = append(channels, channel)
		// now start a go task to load the package info
		go loadPackageInfo(path, channel)
	})

	var packages map[string]*configs.PackageInfo = make(map[string]*configs.PackageInfo)
	for _, result := range channels {
		pkgInfo := <-result
		if pkgInfo.Name != "" {
			packages[pkgInfo.Name] = pkgInfo
		}
	}
	return packages
}

func loadPackageInfo(path string, result chan *configs.PackageInfo) {
	pkgJson, _ := configs.LoadPackageInfo(path)
	result <- pkgJson
}
