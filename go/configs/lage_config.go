package configs

type LageConfig struct {
	NpmClient string              `json:"npmClient"`
	Pipeline  map[string][]string `json:"pipeline"`
}
