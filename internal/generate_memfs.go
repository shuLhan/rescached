// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// +build ignore

package main

import (
	"log"

	"github.com/shuLhan/share/lib/memfs"
)

func main() {
	includes := []string{
		`.*\.html`,
		`.*\.js`,
		`.*\.css`,
		`.*\.png`,
	}

	mfs, err := memfs.New("_www/public/", includes, nil, true)
	if err != nil {
		log.Fatal(err)
	}

	err = mfs.GoGenerate("main", "cmd/rescached/memfs.go", memfs.EncodingGzip)
	if err != nil {
		log.Fatal(err)
	}
}
