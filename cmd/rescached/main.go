// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/shuLhan/share/lib/debug"

	rescached "github.com/shuLhan/rescached-go/v3"
)

func main() {
	var (
		fileConfig string
	)

	log.SetFlags(0)
	log.SetPrefix("rescached: ")

	flag.StringVar(&fileConfig, "config", "", "path to configuration")
	flag.Parse()

	rcd, err := rescached.New(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.Start()
	if err != nil {
		log.Fatal(err)
	}

	if debug.Value >= 4 {
		go debugRuntime()
	}

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	rcd.Stop()
}

func debugRuntime() {
	ticker := time.NewTicker(30 * time.Second)
	memHeap := debug.NewMemHeap()

	for range ticker.C {
		debug.WriteHeapProfile("rescached", true)

		memHeap.Collect()

		fmt.Printf("=== rescached: MemHeap{RelHeapAlloc:%d RelHeapObjects:%d DiffHeapObjects:%d}\n",
			memHeap.RelHeapAlloc, memHeap.RelHeapObjects,
			memHeap.DiffHeapObjects)
	}
}
