// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

// Package rescached implement DNS forwarder with cache.
package rescached

import (
	"errors"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"git.sr.ht/~shulhan/pakakeh.go/lib/dns"
	"git.sr.ht/~shulhan/pakakeh.go/lib/http"
	"git.sr.ht/~shulhan/pakakeh.go/lib/watchfs/v2"
)

// Version of program, overwritten by build.
var Version = `4.4.3`

// Debug level, set by configuration as "rescached::debug".
var Debug int

// Server implement caching DNS server.
type Server struct {
	dns       *dns.Server
	env       *Environment
	rcWatcher *watchfs.FileWatcher

	httpd       *http.Server
	httpdRunner sync.Once
}

// New create and initialize new rescached server.
func New(env *Environment) (srv *Server, err error) {
	err = env.init()
	if err != nil {
		return nil, fmt.Errorf("rescached: New: %w", err)
	}

	env.initHostsBlock()

	srv = &Server{
		env: env,
	}

	err = srv.httpdInit()
	if err != nil {
		return nil, err
	}

	return srv, nil
}

// Start the server, waiting for DNS query from clients, read it and response
// it.
func (srv *Server) Start() (err error) {
	var (
		logp = "Start"

		fcaches *os.File
		hb      *Blockd
		hfile   *dns.HostsFile
		zone    *dns.Zone
		answers []*dns.Answer
	)

	srv.dns, err = dns.NewServer(&srv.env.ServerOptions)
	if err != nil {
		return err
	}

	fcaches, err = os.Open(srv.env.pathFileCaches)
	if err == nil {
		// Load stored caches from file.
		answers, err = srv.dns.Caches.ExternalLoad(fcaches)
		if err != nil {
			log.Printf("%s: %s", logp, err)
		} else {
			fmt.Printf("%s: %d caches loaded from %s\n", logp, len(answers), srv.env.pathFileCaches)
		}

		err = fcaches.Close()
		if err != nil {
			log.Printf("%s: %s", logp, err)
		}
	}

	for _, hb = range srv.env.HostBlockd {
		if !hb.IsEnabled {
			continue
		}

		hfile, err = dns.ParseHostsFile(hb.file)
		if err != nil {
			return fmt.Errorf("%s: %w", logp, err)
		}

		err = srv.dns.Caches.InternalPopulateRecords(hfile.Records, hfile.Path)
		if err != nil {
			return fmt.Errorf("%s: %w", logp, err)
		}

		srv.env.hostBlockdFile[hfile.Name] = hfile
	}

	srv.env.hostsd, err = dns.LoadHostsDir(srv.env.pathDirHosts)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		err = os.MkdirAll(srv.env.pathDirHosts, 0700)
		if err != nil {
			return err
		}
	}

	for _, hfile = range srv.env.hostsd {
		err = srv.dns.Caches.InternalPopulateRecords(hfile.Records, hfile.Path)
		if err != nil {
			return err
		}
	}

	srv.env.zoned, err = dns.LoadZoneDir(srv.env.pathDirZone)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		err = os.MkdirAll(srv.env.pathDirZone, 0700)
		if err != nil {
			return err
		}
	}
	for _, zone = range srv.env.zoned {
		srv.dns.Caches.InternalPopulateZone(zone)
	}

	if len(srv.env.FileResolvConf) > 0 {
		go srv.watchResolvConf()
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

// Stop the server.
func (srv *Server) Stop() {
	var (
		logp = "Stop"

		fcaches *os.File
		err     error
		n       int
	)

	if srv.rcWatcher != nil {
		srv.rcWatcher.Stop()
	}
	srv.dns.Stop()

	// Stores caches to file for next start.
	err = os.MkdirAll(srv.env.pathDirCaches, 0700)
	if err != nil {
		log.Printf("%s: %s", logp, err)
		return
	}

	fcaches, err = os.Create(srv.env.pathFileCaches)
	if err != nil {
		log.Printf("%s: %s", logp, err)
		return
	}
	n, err = srv.dns.Caches.ExternalSave(fcaches)
	if err != nil {
		log.Printf("%s: %s", logp, err)
		// fall-through for Close.
	}
	err = fcaches.Close()
	if err != nil {
		log.Printf("%s: %s", logp, err)
	}
	fmt.Printf("%s: %d caches stored to %s\n", logp, n, srv.env.pathFileCaches)
}

// watchResolvConf watch an update to file resolv.conf.
func (srv *Server) watchResolvConf() {
	var (
		logp      = `watchResolvConf`
		watchOpts = watchfs.FileWatcherOptions{
			File:     srv.env.FileResolvConf,
			Interval: 5 * time.Second,
		}

		fi  os.FileInfo
		err error
		ok  bool
	)

	srv.rcWatcher = watchfs.WatchFile(watchOpts)

	for fi = range srv.rcWatcher.C {
		if fi == nil {
			log.Printf("= %s: file %q deleted\n", logp, srv.env.FileResolvConf)
			return
		}

		ok, err = srv.env.loadResolvConf()
		if err != nil {
			log.Printf(`%s: %s`, logp, err)
			break
		}
		if !ok {
			break
		}
		srv.dns.RestartForwarders(srv.env.NameServers)
	}
}
