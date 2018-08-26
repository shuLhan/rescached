// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/shuLhan/rescached-go"
)

const (
	defConfig = "/etc/rescached/rescached.cfg"
)

var (
	rcd      *rescached.Server
	_filePID string
)

func loadHostsDir(cfg *config) {
	d, err := os.Open(cfg.hostsDir)
	if err != nil {
		log.Println("! loadHostsDir: Open:", err)
		return
	}

	fis, err := d.Readdir(0)
	if err != nil {
		log.Println("! loadHostsDir: Readdir:", err)
		return
	}

	for x := 0; x < len(fis); x++ {
		if fis[x].IsDir() {
			continue
		}

		hostsFile := filepath.Join(cfg.hostsDir, fis[x].Name())

		rcd.LoadHostsFile(hostsFile)
	}
}

func removePID() {
	err := os.Remove(_filePID)
	if err != nil {
		log.Println(err)
	}
}

//
// writePID will write current process PID to file `_filePID` only if the
// file is not exist, otherwise it will return an error.
//
func writePID() (err error) {
	_, err = os.Stat(_filePID)
	if err == nil {
		err = fmt.Errorf("writePID: pid file '%s' exist", _filePID)
		return
	}

	pid := strconv.Itoa(os.Getpid())

	err = ioutil.WriteFile(_filePID, []byte(pid), 0400)

	return
}

func handleSignal() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	stop()
}

func profiling() {
	srv := &http.Server{
		Addr:         "127.0.0.1:5380",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	log.Println(srv.ListenAndServe())
}

func stop() {
	removePID()
	os.Exit(0)
}

func main() {
	var (
		err        error
		fileConfig string
		cfg        *config
	)

	log.SetFlags(0)

	flag.StringVar(&fileConfig, "f", defConfig, "path to configuration")
	flag.Parse()

	cfg, err = newConfig(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	if cfg.debugLevel >= 1 {
		fmt.Printf("= config: %+v\n", cfg)
	}

	_filePID = cfg.filePID
	rescached.DebugLevel = cfg.debugLevel

	rcd, err = rescached.New(cfg.nsNetwork, cfg.nsParents,
		cfg.cachePruneDelay, cfg.cacheThreshold)
	if err != nil {
		log.Fatal(err)
	}

	err = writePID()
	if err != nil {
		log.Fatal(err)
	}

	loadHostsDir(cfg)

	go handleSignal()
	go profiling()

	err = rcd.Start(cfg.listen)
	if err != nil {
		log.Println(err)
		stop()
	}
}
