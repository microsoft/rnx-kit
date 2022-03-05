package configs

type WorkspaceCollection struct {
	Packages []string `json:"packages"`
}

type PackageInfo struct {
	Name             string              `json:"name"`
	Version          string              `json:"version"`
	Private          bool                `json:"private"`
	Main             string              `json:"main"`
	Module           string              `json:"module"`
	Types            string              `json:"types"`
	Scripts          map[string]string   `json:"scripts"`
	Dependencies     map[string]string   `json:"dependencies"`
	DevDependencies  map[string]string   `json:"devDependencies"`
	PeerDependencies map[string]string   `json:"peerDependencies"`
	Workspaces       WorkspaceCollection `json:"workspaces"`
	Lage             LageConfig          `json:"lage"`
}

func LoadPackageInfo(path string) (*PackageInfo, error) {
	var info PackageInfo
	err := LoadJson(path, &info)
	return &info, err
}
