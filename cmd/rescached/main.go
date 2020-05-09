// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/ini"

	rescached "github.com/shuLhan/rescached-go/v3"
)

func main() {
	var (
		fileConfig string
	)

	log.SetFlags(0)

	flag.StringVar(&fileConfig, "config", "", "path to configuration")
	flag.Parse()

	opts := parseConfig(fileConfig)

	rcd, err := rescached.New(opts)
	if err != nil {
		log.Fatal(err)
	}

	go run(rcd)

	if debug.Value >= 2 {
		go debugRuntime()
	}

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	rcd.Stop()
}

func parseConfig(file string) (opts *rescached.Options) {
	opts = rescached.NewOptions()

	cfg, err := ioutil.ReadFile(file)
	if err != nil {
		return opts
	}

	err = ini.Unmarshal(cfg, opts)
	if err != nil {
		return opts
	}

	debug.Value = opts.Debug

	return opts
}

func debugRuntime() {
	ticker := time.NewTicker(30 * time.Second)
	memHeap := debug.NewMemHeap()

	for range ticker.C {
		debug.WriteHeapProfile("rescached", true)

		memHeap.Collect()

		fmt.Printf("= rescached: MemHeap{RelHeapAlloc:%d RelHeapObjects:%d DiffHeapObjects:%d}\n",
			memHeap.RelHeapAlloc, memHeap.RelHeapObjects,
			memHeap.DiffHeapObjects)
	}
}

func run(rcd *rescached.Server) {
	defer func() {
		err := recover()
		if err != nil {
			log.Println("panic: ", err)
		}
	}()

	err := rcd.Start()
	if err != nil {
		log.Println(err)
	}
}
