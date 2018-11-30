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

	"github.com/shuLhan/rescached-go"
	"github.com/shuLhan/share/lib/debug"
)

const (
	defConfig = "/etc/rescached/rescached.cfg"
)

func createRescachedServer(fileConfig string) *rescached.Server {
	cfg, err := newConfig(fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	if debug.Value >= 1 {
		fmt.Printf("= config: %+v\n", cfg)
	}

	opts := &rescached.Options{
		ConnType:        cfg.connType,
		ListenAddress:   cfg.listenAddress,
		ListenPort:      cfg.listenPort,
		NSParents:       cfg.nsParents,
		CachePruneDelay: cfg.cachePruneDelay,
		CacheThreshold:  cfg.cacheThreshold,

		FileResolvConf: cfg.fileResolvConf,
		FilePID:        cfg.filePID,

		DoHPort:          cfg.listenDoHPort,
		DoHParents:       cfg.dohParents,
		DoHAllowInsecure: cfg.dohAllowInsecure,
		DoHCert:          cfg.fileDoHCert,
		DoHCertKey:       cfg.fileDoHCertKey,
	}

	rcd, err := rescached.New(opts)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.WritePID()
	if err != nil {
		log.Fatal(err)
	}

	loadHostsDir(rcd, cfg)
	loadMasterDir(rcd, cfg)

	return rcd
}

func loadHostsDir(rcd *rescached.Server, cfg *config) {
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

func loadMasterDir(rcd *rescached.Server, cfg *config) {
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
