package paths

import (
	"io/fs"
	"path/filepath"
)

func safeSlice(base string, start int, end int) string {
	if end > len(base) {
		end = len(base)
	}
	if start > end {
		start = end
	}
	return base[start:end]
}

func FindWithGlobFunc(name string, root string, globs []string, found func(path string, d fs.DirEntry)) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if d.IsDir() {
			pathChunk := safeSlice(path, len(root)+1, len(path))
			for _, glob := range globs {
				if MatchGlobPartial(pathChunk, glob) {
					return nil
				}
			}
			return fs.SkipDir
		} else if d.Name() == name {
			pathChunk := safeSlice(path, len(root)+1, len(path)-len(d.Name())-1)
			for _, glob := range globs {
				if MatchGlob(pathChunk, glob) {
					found(path, d)
					break
				}
			}
		}

		return nil
	})
}

func FindWithGlob(name string, root string, globs []string) []string {
	found := []string{}
	FindWithGlobFunc(name, root, globs, func(path string, d fs.DirEntry) {
		found = append(found, path)
	})
	return found
}
