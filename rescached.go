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
	env        *environment
	rcWatcher  *libio.Watcher

	httpd       *http.Server
	httpdRunner sync.Once
}

//
// New create and initialize new rescached server.
//
func New(fileConfig string) (srv *Server, err error) {
	env := loadEnvironment(fileConfig)

	if debug.Value >= 1 {
		fmt.Printf("--- rescached: config: %+v\n", env)
	}

	srv = &Server{
		fileConfig: fileConfig,
		env:        env,
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
	srv.dns, err = dns.NewServer(&srv.env.ServerOptions)
	if err != nil {
		return err
	}

	dnsHostsFile, err := dns.ParseHostsFile(dns.GetSystemHosts())
	if err != nil {
		return err
	}
	srv.dns.PopulateCaches(dnsHostsFile.Messages)

	dnsHostsFiles, err := dns.LoadHostsDir(dirHosts)
	if err != nil {
		return err
	}

	for _, dnsHostsFile := range dnsHostsFiles {
		srv.dns.PopulateCaches(dnsHostsFile.Messages)
		srv.env.HostsFiles = append(srv.env.HostsFiles,
			convertHostsFile(dnsHostsFile))
	}

	srv.env.MasterFiles, err = dns.LoadMasterDir(dirMaster)
	if err != nil {
		return err
	}
	for _, masterFile := range srv.env.MasterFiles {
		srv.dns.PopulateCaches(masterFile.Messages())
	}

	if len(srv.env.FileResolvConf) > 0 {
		srv.rcWatcher, err = libio.NewWatcher(
			srv.env.FileResolvConf, 0, srv.watchResolvConf)
		if err != nil {
			log.Fatal("Start:", err)
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
		log.Printf("= ResolvConf: file %q deleted\n", srv.env.FileResolvConf)
		return
	default:
		ok, err := srv.env.loadResolvConf()
		if err != nil {
			log.Println("loadResolvConf: " + err.Error())
			break
		}
		if !ok {
			break
		}

		srv.dns.RestartForwarders(srv.env.NameServers, srv.env.FallbackNS)
	}
}
