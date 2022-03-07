package paths

import (
	"path/filepath"
	"strings"
)

type resultSet struct {
	Path          string
	Globs         string
	GlobstarCount int
}

func (g *resultSet) done() bool {
	// we are done if:
	//  both the path and globs are empty (completely matched)
	//  we have 1 globstar and the globs are exhausted
	//  we have more than one globstar, that means any leftovers are swallowed up
	return (len(g.Path) == 0 && len(g.Globs) == 0) || (g.GlobstarCount == 1 && len(g.Globs) == 0) || g.GlobstarCount > 1
}

/*
	peel off the leftmost term (split at separator) and return the term and the shortened path
*/
func trimLeft(path string, separator rune) (term string, remainder string) {
	sepIndex := strings.IndexRune(path, separator)
	if sepIndex >= 0 {
		return path[0:sepIndex], path[sepIndex+1:]
	}
	return path, ""
}

/*
	peel off the rightmost term (split at separator) and return the term and shortened path
*/
func trimRight(path string, separator rune) (term string, remainder string) {
	sepIndex := strings.LastIndex(path, string(separator))
	if sepIndex >= 0 {
		return path[sepIndex+1:], path[0:sepIndex]
	}
	return path, ""
}

func reduceSet(set *resultSet, getTerm func(path string, separator rune) (term string, remainder string)) bool {
	var matched bool = true
	var glob string
	var term string

	for matched && len(set.Globs) > 0 && len(set.Path) > 0 {
		glob, set.Globs = getTerm(set.Globs, rune('/'))
		if glob == "**" {
			set.GlobstarCount++
			break
		} else {
			term, set.Path = getTerm(set.Path, filepath.Separator)
			matched, _ = filepath.Match(glob, term)
		}
	}
	return matched
}

/*
	MatchGlob sees if the specified path matches the glob pattern. Patterns between separators
	are resolved with filepath.Match whereas globstars (**) are supported. Note that paths between
	globstars are ignored to make this more efficient. Note that glob patterns always use forward
	slashes, whereas paths are assumed to use the filepath.Separator OS specific rune
*/
func MatchGlob(path string, globs string) bool {
	// initialize the set which will be reduced
	set := &resultSet{path, globs, 0}
	// trim the left terms until we get a globstar or are done
	matched := reduceSet(set, trimLeft)

	// if we didn't fail but there is more to parse then trim the right side
	if matched && !set.done() {
		matched = reduceSet(set, trimRight)
	}

	// return matched if nothing failed to match and we have sufficiently finished the set
	return matched && set.done()
}

/*
	see if a path so far matches any of the globs. This is less strict than
	MatchGlob and corresponds to the decision of whether to stop walking a directory
	when searching for a glob match
*/
func MatchGlobPartial(path string, globs string) bool {
	reducer := &resultSet{path, globs, 0}
	return reduceSet(reducer, trimLeft)
}
