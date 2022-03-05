package configs

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

func loadStream(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err == nil {
		return ioutil.ReadAll(file)
	}
	return nil, err
}

func LoadJson(path string, v interface{}) error {
	stream, err := loadStream(path)
	if err == nil {
		err = json.Unmarshal(stream, &v)
	}
	return err
}

func Prettify(v interface{}) string {
	s, _ := json.MarshalIndent(&v, "", "\t")
	return string(s)
}
