package repo

import (
	"path/filepath"

	"github.com/microsoft/rnx_kit/go/configs"
	"github.com/microsoft/rnx_kit/go/paths"
)

type Repo struct {
	RootPath    string
	RootPackage *configs.PackageInfo
	Workspaces  []string
	Packages    map[string]*RepoPkg
}

func initRepo(rootPath string) (*Repo, error) {
	var err error = nil
	var repo Repo = Repo{RootPath: rootPath}

	// find the root package json and open it
	rootJsonPath := filepath.Join(rootPath, "package.json")
	repo.RootPackage, _ = configs.LoadPackageInfo(rootJsonPath)

	// try to load the workspaces
	repo.Workspaces = repo.RootPackage.Workspaces.Packages

	// find packages in the repo
	repo.Packages, err = LoadPackages(rootPath, repo.Workspaces)

	return &repo, err
}

var repos map[string]*Repo = make(map[string]*Repo)

func LoadRepo(wd string) (*Repo, error) {
	var err error = nil
	root := paths.FindRepoRoot()
	_, hasValue := repos[root]
	if !hasValue {
		repos[root], err = initRepo(root)
	}
	return repos[root], err
}
