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
	libio "github.com/shuLhan/share/lib/io"
	"github.com/shuLhan/share/lib/memfs"
	"github.com/shuLhan/share/lib/mlog"

	"github.com/shuLhan/rescached-go/v4"
)

const (
	cmdEmbed = "embed" // Command to generate embedded files.
	cmdDev   = "dev"   // Command to run rescached for local development.
)

func main() {
	var (
		fileConfig string
		running    chan bool
	)

	log.SetFlags(0)
	log.SetPrefix("rescached: ")

	flag.StringVar(&fileConfig, "config", "", "path to configuration")
	flag.Parse()

	env, err := rescached.LoadEnvironment(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	cmd := flag.Arg(0)

	switch cmd {
	case cmdEmbed:
		err = env.HttpdOptions.Memfs.GoEmbed()
		if err != nil {
			log.Fatal(err)
		}
		return

	case cmdDev:
		running = make(chan bool)
		go watchWww(env, running)
	}

	rcd, err := rescached.New(env)
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
	if cmd == cmdDev {
		running <- false
		<-running
	}
	rcd.Stop()
	os.Exit(0)
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

//
// watchWww watch any changes to files inside _www directory and regenerate
// the embed file "memfs_generate.go".
//
func watchWww(env *rescached.Environment, running chan bool) {
	var (
		logp    = "watchWww"
		changeq = make(chan *libio.NodeState, 64)
		dw      = libio.DirWatcher{
			Options: *env.HttpdOptions.Memfs.Opts,
			Callback: func(ns *libio.NodeState) {
				changeq <- ns
			},
		}
		node      *memfs.Node
		nChanges  int
		err       error
		isRunning bool = true
	)

	dw.Start()

	tick := time.NewTicker(5 * time.Second)

	for isRunning {
		select {
		case ns := <-changeq:
			node, err = env.HttpdOptions.Memfs.Get(ns.Node.Path)
			if err != nil {
				log.Printf("%s: %q: %s", logp, ns.Node.Path, err)
				continue
			}
			if node != nil {
				err = node.Update(nil, 0)
				if err != nil {
					mlog.Errf("%s: %q: %s", logp, node.Path, err)
					continue
				}
				nChanges++
			}

		case <-tick.C:
			if nChanges > 0 {
				fmt.Printf("--- %d changes\n", nChanges)
				err = env.HttpdOptions.Memfs.GoEmbed()
				if err != nil {
					log.Printf("%s", err)
				}
				nChanges = 0
			}

		case <-running:
			isRunning = false
		}
	}

	// Run GoEmbed for the last time.
	if nChanges > 0 {
		fmt.Printf("--- %d changes\n", nChanges)
		err = env.HttpdOptions.Memfs.GoEmbed()
		if err != nil {
			log.Printf("%s", err)
		}
	}
	dw.Stop()
	running <- false
}
