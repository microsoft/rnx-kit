package tasks

import "fmt"

type TaskMap map[string]*Task

type TaskList struct {
	tasks TaskMap
}

func (t *TaskList) Init() {
	t.tasks = make(TaskMap)
}

func (t *TaskList) QueueTask(taskName string, task *Task, lookup TaskMap) {
	_, alreadyAdded := t.tasks[taskName]
	if !alreadyAdded {
		t.tasks[taskName] = task
		for _, prereq := range task.Prereqs() {
			prereqTask, found := lookup[prereq]
			if found {
				t.QueueTask(prereq, prereqTask, lookup)
			}
		}
	}
}

func (t *TaskList) canExecute(task *Task) bool {
	for _, prereq := range task.Prereqs() {
		if _, foundPrereq := t.tasks[prereq]; foundPrereq {
			return false
		}
	}
	return true
}

func (t *TaskList) Execute() error {
	var err error = nil
	running := 0
	resultQueue := make(chan *TaskResult)
	var lastResult *TaskResult
	startedTasks := make(map[string]bool)

	for len(t.tasks) > 0 && err == nil {
		// iterate over tasks and start any that can execute
		for taskName, task := range t.tasks {
			if _, started := startedTasks[taskName]; !started && t.canExecute(task) {
				running++
				startedTasks[taskName] = true
				go task.AsyncExecute(resultQueue)
			}
		}
		// now grab a result off the queue, only do one at a time to ensure that any that can be started
		// are started before we end up waiting on another result
		lastResult = <-resultQueue
		// free this entry from the map since it is done
		delete(t.tasks, lastResult.TaskName)
		running--
		// if it was an error result capture the error and clear the running tasks
		if lastResult.Err != nil {
			fmt.Printf("ERROR in %s\n", lastResult.TaskName)
			fmt.Printf("%s\n", lastResult.Err.Error())
			err = lastResult.Err
			for ; running > 0; running-- {
				lastResult = <-resultQueue
			}
		}
	}
	return err
}

func BuildTaskList(globalList TaskMap, command string, startPkg string) *TaskList {
	tasks := new(TaskList)
	tasks.Init()
	// go through the global list and queue as appropriate
	for taskName, task := range globalList {
		if task.CmdName() == command && (startPkg == "" || task.PkgName() == startPkg) {
			tasks.QueueTask(taskName, task, globalList)
		}
	}
	return tasks
}
