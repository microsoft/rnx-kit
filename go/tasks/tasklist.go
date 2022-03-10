package tasks

import "fmt"

/*
	A map ot Tasks, keyed on task name (generally package:verb)
*/
type TaskMap map[string]*Task

/*
	A list of tasks to be executed
*/
type TaskList struct {
	tasks TaskMap
}

/* Initialize the TaskList */
func (t *TaskList) Init() {
	t.tasks = make(TaskMap)
}

/*
	Queue a task in the task list. Will also traverse prerequisite tasks to ensure this
	task executes correctly
*/
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

/*
	Check to see if a task in the TaskList is ready to execute
*/
func (t *TaskList) canExecute(task *Task) bool {
	for _, prereq := range task.Prereqs() {
		if _, foundPrereq := t.tasks[prereq]; foundPrereq {
			return false
		}
	}
	return true
}

/*
	Execute this task list, returning the first error encountered (which will stop execution)
*/
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

/*
	Create a TaskList given the global list of tasks, the command to execute, and an optional starting
	package to work from. If startPkg is empty it will execute the command globally
*/
func BuildTaskList(globalList TaskMap, commands []string, startPkg string) *TaskList {
	tasks := new(TaskList)
	tasks.Init()
	for _, command := range commands {
		// go through the global list and queue as appropriate
		for taskName, task := range globalList {
			if task.CmdName() == command && (startPkg == "" || task.PkgName() == startPkg) {
				tasks.QueueTask(taskName, task, globalList)
			}
		}
	}
	return tasks
}
