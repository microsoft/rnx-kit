package tasks

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
)

/*
	Information about the package, provided to the task, embedded in RepoPkg right now
*/
type TaskPkgInfo struct {
	Name string
	Root string
}

/*
	Represents a task that can be executed
*/
type Task struct {
	// information about this package
	packageInfo *TaskPkgInfo
	// name of the command (e.g. build, bundle, etc)
	commandName string
	// text of the script block
	command string
	// tasks which need to be completed before this task can run
	prereqTasks []string
}

/*
	Results of an execute call, passed back across the channel
*/
type TaskResult struct {
	Err      error
	TaskName string
}

/* Initialize a task */
func MakeTask(pkgInfo *TaskPkgInfo, cmdName string, command string) *Task {
	return &Task{pkgInfo, cmdName, command, []string{}}
}

// accessor functions for fields in tasks

func (t *Task) PkgName() string   { return t.packageInfo.Name }
func (t *Task) PkgRoot() string   { return t.packageInfo.Root }
func (t *Task) CmdName() string   { return t.commandName }
func (t *Task) Prereqs() []string { return t.prereqTasks }

/* get the task name in merged package:command form */
func (t *Task) Name() string {
	return GetTaskName(t.commandName, t.PkgName())
}

/*
	return one or more commands that need to be executed for this task
*/
func (t *Task) commands() []*exec.Cmd {
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

/*
	Execute the task in t.Commands. Note that given this corresponds to a script tag it can actually contain multiple
	commands, split on &&.
*/
func (t *Task) Execute() error {
	commands := t.commands()
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

/*
	Execution function, should be called via a go command, with results being pushed into the supplied channel
*/
func (t *Task) AsyncExecute(result chan *TaskResult) {
	result <- &TaskResult{t.Execute(), t.Name()}
}

/*
	Add a prerequisite task, i.e. one that needs to finish before this task can run
*/
func (t *Task) AddPrereq(prereq string) {
	t.prereqTasks = append(t.prereqTasks, prereq)
}

/*
	helper to get the task name in standard format
*/
func GetTaskName(command string, pkgName string) string {
	return pkgName + ":" + command
}

/*
	commands which should be ignored as they are just no-ops. Echo is an example here
*/
var ignoreCommand map[string]bool = map[string]bool{
	"echo": true,
}

/*
	commands which should be invoked directly from the OS, rather than via node
*/
var directCommands map[string]bool = map[string]bool{
	"mkdir": true,
}

/*
	build up a exec.Cmd, taking into account working directory and the ignore and direct command
	lists
*/
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
