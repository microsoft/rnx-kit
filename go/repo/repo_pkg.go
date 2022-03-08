package repo

import (
	"errors"
	"strings"

	"github.com/microsoft/rnx_kit/go/configs"
)

type RepoPkg struct {
	name     string
	root     string
	pkgJson  *configs.PackageInfo
	Deps     map[string]*RepoPkg
	Verbs    map[string]string
	NodeDeps map[string]string
}

func CreateRepoPkg(rootPath string, pkgJson *configs.PackageInfo) *RepoPkg {
	pkg := RepoPkg{name: pkgJson.Name, root: rootPath, pkgJson: pkgJson}
	pkg.Deps = make(map[string]*RepoPkg)
	pkg.Verbs = make(map[string]string)
	pkg.NodeDeps = make(map[string]string)
	return &pkg
}

func (r *RepoPkg) Name() string                  { return r.name }
func (r *RepoPkg) Root() string                  { return r.root }
func (r *RepoPkg) PkgJson() *configs.PackageInfo { return r.pkgJson }

type WalkResult uint16

const (
	Stop WalkResult = iota
	Continue
)

func (r *RepoPkg) walkDepsHelper(stackSoFar []*RepoPkg, callback func(pkg *RepoPkg, stack []*RepoPkg) WalkResult) WalkResult {
	newStack := append(stackSoFar, r)
	for _, pkg := range r.Deps {
		if callback(pkg, newStack) == Stop || pkg.walkDepsHelper(newStack, callback) == Stop {
			return Stop
		}
	}
	return Continue
}

func (r *RepoPkg) WalkDeps(callback func(pkg *RepoPkg, stack []*RepoPkg) WalkResult) {
	r.walkDepsHelper([]*RepoPkg{}, callback)
}

func (r *RepoPkg) FindDep(pkgName string) []string {
	result := []string{}
	r.WalkDeps(func(pkg *RepoPkg, stack []*RepoPkg) WalkResult {
		if pkg.name == pkgName {
			for _, pathPart := range stack {
				result = append(result, pathPart.name)
			}
			return Stop
		}
		return Continue
	})
	return result
}

func addDependencies(pkg *RepoPkg, packages map[string]*RepoPkg, depMap map[string]string) error {
	// process the list of dependencies/devDependencies and split them into repo packages and node packages
	for dep, _ := range depMap {
		pkgRef, inRepo := packages[dep]
		if inRepo {
			// try to find this package in the tree already to ensure we don't add a cycle
			cycle := pkgRef.FindDep(pkg.name)
			if len(cycle) > 0 {
				return errors.New("Cycle detected: " + pkg.name + " -> " + strings.Join(cycle, " -> ") + " -> " + pkg.name)
			}
			pkg.Deps[dep] = pkgRef
		} else {
			// remember the node module dependency with version info
			pkg.NodeDeps[dep] = depMap[dep]
		}
	}
	return nil
}

func BuildDepTree(packages map[string]*RepoPkg) error {
	// iterate through the packages connecting them in a tree, error on cycles
	for _, pkg := range packages {
		// now for each package process dependencies and devDependencies from the loaded package.json
		err := addDependencies(pkg, packages, pkg.pkgJson.Dependencies)
		if err == nil {
			err = addDependencies(pkg, packages, pkg.pkgJson.DevDependencies)
		}
		if err != nil {
			return err
		}
	}
	return nil
}
