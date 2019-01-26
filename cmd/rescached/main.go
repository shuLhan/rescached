// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	_ "net/http/pprof"
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

	if debug.Value >= 1 {
		fmt.Printf("= config: %+v\n", opts)
	}

	rcd := rescached.New(opts)

	err = rcd.WritePID()
	if err != nil {
		log.Fatal(err)
	}

	rcd.LoadHostsDir(opts.DirHosts)
	rcd.LoadMasterDir(opts.DirMaster)

	return rcd
}

func handleSignal(rcd *rescached.Server) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	rcd.Stop()
}

func profiling() {
	pprofAddr := os.Getenv("RESCACHED_HTTP_PPROF")
	if len(pprofAddr) == 0 {
		pprofAddr = "127.0.0.1:5380"
	}

	srv := &http.Server{
		Addr:        pprofAddr,
		ReadTimeout: 5 * time.Second,
		IdleTimeout: 120 * time.Second,
	}

	log.Println(srv.ListenAndServe())
}

func main() {
	var (
		err        error
		fileConfig string
		defConfig  = "/etc/rescached/rescached.cfg"
	)

	log.SetFlags(0)

	flag.StringVar(&fileConfig, "f", defConfig, "path to configuration")
	flag.Parse()

	rcd := createRescachedServer(fileConfig)

	go handleSignal(rcd)
	go profiling()

	err = rcd.Start()
	if err != nil {
		log.Println(err)
		rcd.Stop()
	}
}
