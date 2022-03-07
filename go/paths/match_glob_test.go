package paths

import (
	"path/filepath"
	"testing"
)

type testValues struct {
	Path  string
	Glob  string
	Match bool
}

func updateForFS(testVals []testValues) {
	if filepath.Separator != '/' {
		for _, val := range testVals {
			val.Path = filepath.FromSlash(val.Path)
		}
	}
}

func runMatchValueTest(t *testing.T, testName string, matchFn func(path string, glob string) bool, values []testValues) {
	updateForFS(values)
	for _, value := range values {
		result := matchFn(value.Path, value.Glob)
		if result != value.Match {
			t.Logf("%s failed with path %s and glob %s, returned %v", testName, value.Path, value.Glob, result)
			t.Fail()
		}
	}
}

var matchGlobTests []testValues = []testValues{
	{"packages/foo/package.json", "packages/*/package.json", true},
	{"packages/foo/bar/package.json", "packages/**/package.json", true},
	{"packages/foo/bar/baz", "packages/**", true},
	{"scripts/foo/bar/baz", "packages/**", false},
	{"foo/bar/baz/package.json", "**/package.json", true},
	{"foo/bar/baz/package.json", "**/baz/package.json", true},
	{"foo/bar/baz/package.json", "**/bar/package.json", false},
	{"a/b/c/d/e/f/g/h/package.json", "a/b/**/h/package.json", true},
	{"a/b/c/d/e/f/g/h/package.json", "a/b/c/**/d/e/f/g/h/package.json", true},
	{"a/b/c/d/e/f/g/h/package.json", "a/b/**/g/package.json", false},
	{"foo/bar/baz/pkg.json", "f*/b*/**", true},
	{"foo/bar/baz/pkg.json", "f*/c*/**", false},
}

func TestMatchGlob(t *testing.T) {
	runMatchValueTest(t, "MatchGlob", MatchGlob, matchGlobTests)
}

var matchGlobPartialTests []testValues = []testValues{
	{"packages", "packages/*", true},
	{"pkgs", "packages/*", false},
	{"packages", "packages/foo/*", true},
	{"packages", "packages/foo/**", true},
	{"nothing/matters/here", "**/mismatched", true},
	{"a/b/c/d/e", "a/b/c/**", true},
	{"a/b/c/d/e", "a/b/e/**", false},
}

func TestMatchGlobPartial(t *testing.T) {
	runMatchValueTest(t, "MatchGlobPartial", MatchGlobPartial, matchGlobPartialTests)
}
