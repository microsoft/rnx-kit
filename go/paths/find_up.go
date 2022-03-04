package paths

import (
	"filepath"
	"os"
)

/*
	walk up the file tree to find files or directories
	  starting
			from wd or the current working directory if it is empty or a relative path
	  stopping
			if any directory (including wd) contain any entries in filenames
	  	or if the root is hit.

	returns:
	  path, found filename, err [nil | os.ErrNotExist]

	usage:
		file/directory names will be checked in the order they appear in filenames
		empty filenames will result in returning the root, with a not found error
*/
func FindUp(filenames []string, wd string) (string, string, error) {
	// resolve any ambiguities, join relative paths to cwd, then clean the result to prepare
	wd = filepath.Abs(wd)

	// loop until we find something or get to the root
	for true {
		// check the filenames in the current working directory to see if any exist
		for _, filename := range filenames {
			var fullPath string = filepath.Join(wd, filename)
			// if the full path didn't return an error with os.Stat return the path and filename found
			if _, err := os.Stat(fullPath); err == nil {
				return wd, filename, nil
			}
		}
		// now try to walk up as long as Base returns a value
		var nextWd string = filepath.Dir(wd)
		if nextWd != wd {
			wd = nextWd
		} else {
			break
		}
	}
	return wd, "", os.ErrNotExist
}

func Cwd() string {
	current, err := os.Getwd()
	if err == nil {
		return current
	}

	return ""
}
