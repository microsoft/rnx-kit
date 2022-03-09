package tasks

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type TaskPkgInfo struct {
	Name string
	Root string
}

type Task struct {
	packageInfo *TaskPkgInfo
	commandName string
	command     string
	prereqTasks []string
}

type TaskResult struct {
	Err      error
	TaskName string
}

func MakeTask(pkgInfo *TaskPkgInfo, cmdName string, command string) *Task {
	return &Task{pkgInfo, cmdName, command, []string{}}
}

func (t *Task) PkgName() string   { return t.packageInfo.Name }
func (t *Task) PkgRoot() string   { return t.packageInfo.Root }
func (t *Task) CmdName() string   { return t.commandName }
func (t *Task) Prereqs() []string { return t.prereqTasks }

func (t *Task) Name() string {
	return GetTaskName(t.commandName, t.PkgName())
}

func (t *Task) Commands() []*exec.Cmd {
	args := strings.Split(t.command, " ")
	sliceStart := 0
	commands := []*exec.Cmd{}
	// process args looking for "&" strings as command separators
	for i := 0; i <= len(args); i++ {
		if i == len(args) || args[i] == "&&" {
			argSlice := args[sliceStart:i]
			sliceStart = i + 1
			if len(argSlice) > 0 {
				commands = append(commands, getCommand(argSlice, t.PkgRoot()))
			}
		}
	}
	return commands
}

func (t *Task) Execute() error {
	commands := t.Commands()
	var err error = nil
	startTime := time.Now()
	fmt.Printf("Starting: %s - %s\n", t.CmdName(), t.PkgName())
	for _, cmd := range commands {
		if cmd != nil && err == nil {
			err = cmd.Run()
		}
	}
	fmt.Printf("Finished: %s - %s in %.2f seconds\n", t.CmdName(), t.PkgName(), time.Since(startTime).Seconds())
	return err
}

func (t *Task) AsyncExecute(result chan *TaskResult) {
	result <- &TaskResult{t.Execute(), t.Name()}
}

func (t *Task) AddPrereq(prereq string) {
	t.prereqTasks = append(t.prereqTasks, prereq)
}

func GetTaskName(command string, pkgName string) string {
	return pkgName + ":" + command
}

var ignoreCommand map[string]bool = map[string]bool{
	"echo": true,
}

var directCommands map[string]bool = map[string]bool{
	"mkdir": true,
}

func getCommand(args []string, wd string) *exec.Cmd {
	if len(args) > 0 && !ignoreCommand[args[0]] {
		var cmd *exec.Cmd
		if directCommands[args[0]] {
			cmd = exec.Command(args[0], args[1:]...)
		} else {
			cmd = exec.Command("yarn", args...)
		}
		cmd.Dir = wd
		return cmd
	}
	return nil
}
