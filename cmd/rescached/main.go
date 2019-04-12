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

	rescached "github.com/shuLhan/rescached-go"
)

func createRescachedServer(fileConfig string) *rescached.Server {
	opts, err := parseConfig(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	rcd, err := rescached.New(opts)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.WritePID()
	if err != nil {
		log.Fatal(err)
	}

	return rcd
}

func handleSignal(rcd *rescached.Server) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	rcd.Stop()
}

func debugRuntime(rcd *rescached.Server) {
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

func main() {
	var (
		fileConfig string
		defConfig  = "/etc/rescached/rescached.cfg"
	)

	log.SetFlags(0)

	flag.StringVar(&fileConfig, "f", defConfig, "path to configuration")
	flag.Parse()

	rcd := createRescachedServer(fileConfig)

	go handleSignal(rcd)

	if debug.Value >= 2 {
		go debugRuntime(rcd)
	}

	err := rcd.Start()
	if err != nil {
		log.Println(err)
		rcd.Stop()
	}
}
