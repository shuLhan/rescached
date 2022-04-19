// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/memfs"

	"github.com/shuLhan/rescached-go/v4"
)

const (
	cmdEmbed = "embed" // Command to generate embedded files.
	cmdDev   = "dev"   // Command to run rescached for local development.
)

func main() {
	var (
		env        *rescached.Environment
		rcd        *rescached.Server
		dirBase    string
		fileConfig string
		cmd        string
		running    chan bool
		qsignal    chan os.Signal
		err        error
	)

	log.SetFlags(0)
	log.SetPrefix("rescached: ")

	flag.StringVar(&dirBase, "dir-base", "", "Base directory for reading and storing rescached data.")
	flag.StringVar(&fileConfig, "config", "", "Path to configuration.")
	flag.Parse()

	env, err = rescached.LoadEnvironment(dirBase, fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	cmd = strings.ToLower(flag.Arg(0))

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

	rcd, err = rescached.New(env)
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

	qsignal = make(chan os.Signal, 1)
	signal.Notify(qsignal, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM, syscall.SIGINT)
	<-qsignal
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

// watchWww watch any changes to files inside _www directory and regenerate
// the embed file "memfs_generate.go".
func watchWww(env *rescached.Environment, running chan bool) {
	var (
		logp      = "watchWww"
		tick      = time.NewTicker(5 * time.Second)
		isRunning = true

		dw       *memfs.DirWatcher
		nChanges int
		err      error
	)

	dw, err = env.HttpdOptions.Memfs.Watch(memfs.WatchOptions{})
	if err != nil {
		log.Fatalf("%s: %s", logp, err)
	}

	for isRunning {
		select {
		case <-dw.C:
			nChanges++

		case <-tick.C:
			if nChanges == 0 {
				continue
			}

			fmt.Printf("--- %d changes\n", nChanges)
			err = env.HttpdOptions.Memfs.GoEmbed()
			if err != nil {
				log.Printf("%s", err)
			}
			nChanges = 0

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
