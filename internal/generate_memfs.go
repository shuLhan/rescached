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
	opts := memfs.Options{
		Root: "_www",
		Includes: []string{
			`.*\.html`,
			`.*\.js`,
			`.*\.css`,
			`.*\.png`,
		},
	}
	mfs, err := memfs.New(&opts)
	if err != nil {
		log.Fatal(err)
	}
	err = mfs.GoGenerate("rescached", "memFS", "memfs_generate.go", memfs.EncodingGzip)
	if err != nil {
		log.Fatal(err)
	}
}
