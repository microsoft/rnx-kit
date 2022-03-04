package paths

import (
	"os"
)

func FindUp(filenames []string, wd string) string {
	if wd != "" {
		wd = Cwd()
	}
	return ""
}

func Cwd() string {
	current, err := os.Getwd()
	if err == nil {
		return current
	}

	return ""
}
