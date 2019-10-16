// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS forwarder with cache.
package rescached

import (
	"fmt"
	"log"
	"os"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	libio "github.com/shuLhan/share/lib/io"
)

// Server implement caching DNS server.
type Server struct {
	dns  *dns.Server
	opts *Options
}

//
// New create and initialize new rescached server.
//
func New(opts *Options) (srv *Server, err error) {
	if opts == nil {
		opts = NewOptions()
	}

	opts.init()

	if debug.Value >= 1 {
		fmt.Printf("rescached: config: %+v\n", opts)
	}

	dnsServer, err := dns.NewServer(&opts.ServerOptions)
	if err != nil {
		return nil, err
	}

	dnsServer.LoadHostsDir(opts.DirHosts)
	dnsServer.LoadMasterDir(opts.DirMaster)
	dnsServer.LoadHostsFile("")

	srv = &Server{
		dns:  dnsServer,
		opts: opts,
	}

	return srv, nil
}

//
// Start the server, waiting for DNS query from clients, read it and response
// it.
//
func (srv *Server) Start() (err error) {
	fmt.Printf("= Listening on %q (UDP and TCP) and port %d for HTTP(S)\n",
		srv.opts.ListenAddress, srv.opts.HTTPPort)

	if len(srv.opts.FileResolvConf) > 0 {
		_, err = libio.NewWatcher(srv.opts.FileResolvConf, 0, srv.watchResolvConf)
		if err != nil {
			log.Fatal("rescached: Start:", err)
		}
	}

	srv.dns.Start()
	srv.dns.Wait()

	return nil
}

//
// Stop the server.
//
func (srv *Server) Stop() {
	os.Exit(0)
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
