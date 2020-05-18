// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS forwarder with cache.
package rescached

import (
	"fmt"
	"log"
	"sync"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/http"
	libio "github.com/shuLhan/share/lib/io"
)

// Server implement caching DNS server.
type Server struct {
	fileConfig string
	dns        *dns.Server
	opts       *Options
	rcWatcher  *libio.Watcher

	httpd       *http.Server
	httpdRunner sync.Once
}

//
// New create and initialize new rescached server.
//
func New(fileConfig string) (srv *Server, err error) {
	opts := loadOptions(fileConfig)

	if debug.Value >= 1 {
		fmt.Printf("rescached: config: %+v\n", opts)
	}

	srv = &Server{
		fileConfig: fileConfig,
		opts:       opts,
	}

	err = srv.httpdInit()
	if err != nil {
		return nil, err
	}

	return srv, nil
}

//
// Start the server, waiting for DNS query from clients, read it and response
// it.
//
func (srv *Server) Start() (err error) {
	srv.dns, err = dns.NewServer(&srv.opts.ServerOptions)
	if err != nil {
		return err
	}

	srv.dns.LoadHostsDir(srv.opts.DirHosts)
	srv.dns.LoadMasterDir(srv.opts.DirMaster)
	srv.dns.LoadHostsFile("")

	if len(srv.opts.FileResolvConf) > 0 {
		srv.rcWatcher, err = libio.NewWatcher(
			srv.opts.FileResolvConf, 0, srv.watchResolvConf)
		if err != nil {
			log.Fatal("rescached: Start:", err)
		}
	}

	go func() {
		srv.httpdRunner.Do(srv.httpdRun)
	}()

	go srv.run()

	return nil
}

func (srv *Server) run() {
	defer func() {
		err := recover()
		if err != nil {
			log.Println("panic: ", err)
		}
	}()

	err := srv.dns.ListenAndServe()
	if err != nil {
		log.Println(err)
	}
}

//
// Stop the server.
//
func (srv *Server) Stop() {
	if srv.rcWatcher != nil {
		srv.rcWatcher.Stop()
	}
	srv.dns.Stop()
}

func (srv *Server) watchResolvConf(ns *libio.NodeState) {
	switch ns.State {
	case libio.FileStateDeleted:
		log.Printf("= ResolvConf: file %q deleted\n", srv.opts.FileResolvConf)
		return
	default:
		ok, err := srv.opts.loadResolvConf()
		if err != nil {
			log.Println("rescached: loadResolvConf: " + err.Error())
			break
		}
		if !ok {
			break
		}

		srv.dns.RestartForwarders(srv.opts.NameServers, srv.opts.FallbackNS)
	}
}
