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

func createRescachedServer(fileConfig string) {
	cfg, err := newConfig(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	if cfg.debugLevel >= 1 {
		fmt.Printf("= config: %+v\n", cfg)
	}

	_filePID = cfg.filePID
	rescached.DebugLevel = cfg.debugLevel

	opts := &rescached.Options{
		ConnType:         cfg.connType,
		ListenAddress:    cfg.listenAddress,
		ListenPort:       cfg.listenPort,
		ListenDoHPort:    cfg.listenDoHPort,
		NSParents:        cfg.nsParents,
		DoHParents:       cfg.dohParents,
		DoHAllowInsecure: cfg.dohAllowInsecure,
		CachePruneDelay:  cfg.cachePruneDelay,
		CacheThreshold:   cfg.cacheThreshold,
		FileResolvConf:   cfg.fileResolvConf,
		FileCert:         cfg.fileDoHCert,
		FileCertKey:      cfg.fileDoHCertKey,
	}

	rcd, err = rescached.New(opts)
	if err != nil {
		log.Fatal(err)
	}

	err = writePID()
	if err != nil {
		log.Fatal(err)
	}

	loadHostsDir(cfg)
	loadMasterDir(cfg)
}

func loadHostsDir(cfg *config) {
	if len(cfg.dirHosts) == 0 {
		return
	}

	d, err := os.Open(cfg.dirHosts)
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

		hostsFile := filepath.Join(cfg.dirHosts, fis[x].Name())

		rcd.LoadHostsFile(hostsFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
	}
}

func loadMasterDir(cfg *config) {
	if len(cfg.dirMaster) == 0 {
		return
	}

	d, err := os.Open(cfg.dirMaster)
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

		masterFile := filepath.Join(cfg.dirMaster, fis[x].Name())

		rcd.LoadMasterFile(masterFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
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

func stop() {
	removePID()
	os.Exit(0)
}

func main() {
	var (
		err        error
		fileConfig string
	)

	log.SetFlags(0)

	flag.StringVar(&fileConfig, "f", defConfig, "path to configuration")
	flag.Parse()

	createRescachedServer(fileConfig)

	go handleSignal()
	go profiling()

	err = rcd.Start()
	if err != nil {
		log.Println(err)
		stop()
	}
}
