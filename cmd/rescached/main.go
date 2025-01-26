// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

// Program rescached server that caching internet name and address on local
// memory for speeding up DNS resolution.
//
// Rescached primary goal is only to caching DNS queries and answers, used by
// personal or small group of users, to minimize unneeded traffic to outside
// network.
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

	"git.sr.ht/~shulhan/ciigo"
	"git.sr.ht/~shulhan/pakakeh.go/lib/debug"
	"git.sr.ht/~shulhan/pakakeh.go/lib/memfs"

	"git.sr.ht/~shulhan/rescached"
)

const (
	cmdDev     = `dev`   // Command to run rescached for local development.
	cmdEmbed   = `embed` // Command to generate embedded files.
	cmdVersion = `version`
)

func main() {
	var (
		dirBase    string
		fileConfig string
	)

	log.SetFlags(0)
	log.SetPrefix("rescached: ")

	flag.StringVar(&dirBase, "dir-base", "", "Base directory for reading and storing rescached data.")
	flag.StringVar(&fileConfig, "config", "", "Path to configuration.")
	flag.Parse()

	var (
		env *rescached.Environment
		err error
	)

	env, err = rescached.LoadEnvironment(dirBase, fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	var (
		cmd     = strings.ToLower(flag.Arg(0))
		running chan bool
	)

	switch cmd {
	case cmdDev:
		running = make(chan bool)
		go watchWww(env, running)
		go watchWwwDoc()

	case cmdEmbed:
		err = env.HttpdOptions.Memfs.GoEmbed()
		if err != nil {
			log.Fatal(err)
		}
		return

	case cmdVersion:
		fmt.Printf("rescached version %s\n", rescached.Version)
		return
	}

	var rcd *rescached.Server

	rcd, err = rescached.New(env)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.Start()
	if err != nil {
		log.Fatal(err)
	}

	if rescached.Debug >= 4 {
		go debugRuntime()
	}

	var qsignal = make(chan os.Signal, 1)
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
		tick      = time.NewTicker(3 * time.Second)
		isRunning = true

		changeq  <-chan []*memfs.Node
		nChanges int
		err      error
	)

	changeq, err = env.HttpdOptions.Memfs.Watch(memfs.WatchOptions{})
	if err != nil {
		log.Fatalf("%s: %s", logp, err)
	}

	for isRunning {
		select {
		case <-changeq:
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
	env.HttpdOptions.Memfs.StopWatch()
	running <- false
}

func watchWwwDoc() {
	var (
		logp        = "watchWwwDoc"
		convertOpts = ciigo.ConvertOptions{
			Root:         "_www/doc",
			HTMLTemplate: "_www/doc/html.tmpl",
		}

		err error
	)

	err = ciigo.Watch(convertOpts)
	if err != nil {
		log.Fatalf("%s: %s", logp, err)
	}
}
