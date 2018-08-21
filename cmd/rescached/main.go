// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/shuLhan/rescached.go"
)

const (
	cfgFilename = "/etc/rescached/rescached.cfg"
)

var (
	rcd *rescached.Server
	cfg *config
)

func removePID() {
	err := os.Remove(cfg.filePID)
	if err != nil {
		log.Println(err)
	}
}

//
// writePID will write current process PID to file `filePID` only if the
// file is not exist, otherwise it will return an error.
//
func writePID() (err error) {
	_, err = os.Stat(cfg.filePID)
	if err == nil {
		err = fmt.Errorf("writePID: pid file '%s' exist", cfg.filePID)
		return
	}

	pid := strconv.Itoa(os.Getpid())

	err = ioutil.WriteFile(cfg.filePID, []byte(pid), 0400)

	return
}

func handleSignal() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM,
		syscall.SIGINT)
	<-c
	stop()
}

func stop() {
	removePID()
	os.Exit(0)
}

func main() {
	var err error

	log.SetFlags(0)

	cfg, err = newConfig(cfgFilename)
	if err != nil {
		log.Fatal(err)
	}

	if cfg.debugLevel >= 1 {
		fmt.Printf("= config: %+v\n", cfg)
	}

	rescached.DebugLevel = cfg.debugLevel

	rcd, err = rescached.New(cfg.nsParents)
	if err != nil {
		log.Fatal(err)
	}

	err = writePID()
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.Start(cfg.listen)
	if err != nil {
		log.Println(err)
	}

	handleSignal()
}
