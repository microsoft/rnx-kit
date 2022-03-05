package paths

var repoRoot = ""

func FindRepoRoot() string {
	if repoRoot == "" {
		repoRoot, _ = FindUpPath(".git", "")
	}
	return repoRoot
}
