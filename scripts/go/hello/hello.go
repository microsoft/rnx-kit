package main

import (
  "fmt"
  "os"
)

func main() {
  fmt.Println("Hello, World!")
  for index, arg := range os.Args {
    fmt.Printf("args[%d]=%s\n", index, arg)
  }
}
