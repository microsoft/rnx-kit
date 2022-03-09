package repo

type Directive struct {
	Command string
	Cascade bool
}

type PipelineMap map[string][]*Directive

func BuildPipelines(fromLage map[string][]string) PipelineMap {
	pipeline := make(PipelineMap)
	for cmd, val := range fromLage {
		directives := []*Directive{}
		for _, directive := range val {
			if len(directive) > 0 {
				cascade := directive[0] == '^'
				if cascade {
					directive = directive[1:]
				}
				directives = append(directives, &Directive{directive, cascade})
			}
		}
		if len(directives) > 0 {
			pipeline[cmd] = directives
		}
	}

	return pipeline
}
