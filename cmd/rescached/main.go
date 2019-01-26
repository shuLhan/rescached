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
	"path/filepath"
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

	rcd, err := rescached.New(opts)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.WritePID()
	if err != nil {
		log.Fatal(err)
	}

	loadHostsDir(rcd, opts)
	loadMasterDir(rcd, opts)

	return rcd
}

func loadHostsDir(rcd *rescached.Server, opts *rescached.Options) {
	if len(opts.DirHosts) == 0 {
		return
	}

	d, err := os.Open(opts.DirHosts)
	if err != nil {
		log.Println("! loadHostsDir: Open:", err)
		return
	}

	fis, err := d.Readdir(0)
	if err != nil {
		log.Println("! loadHostsDir: Readdir:", err)
		err = d.Close()
		if err != nil {
			log.Println("! loadHostsDir: Close:", err)
		}
		return
	}

	for x := 0; x < len(fis); x++ {
		if fis[x].IsDir() {
			continue
		}

		hostsFile := filepath.Join(opts.DirHosts, fis[x].Name())

		rcd.LoadHostsFile(hostsFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
	}
}

func loadMasterDir(rcd *rescached.Server, opts *rescached.Options) {
	if len(opts.DirMaster) == 0 {
		return
	}

	d, err := os.Open(opts.DirMaster)
	if err != nil {
		log.Println("! loadMasterDir: ", err)
		return
	}

	fis, err := d.Readdir(0)
	if err != nil {
		log.Println("! loadMasterDir: ", err)
		err = d.Close()
		if err != nil {
			log.Println("! loadMasterDir: Close:", err)
		}
		return
	}

	for x := 0; x < len(fis); x++ {
		if fis[x].IsDir() {
			continue
		}

		masterFile := filepath.Join(opts.DirMaster, fis[x].Name())

		rcd.LoadMasterFile(masterFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
	}
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
