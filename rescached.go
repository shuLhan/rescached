// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS forwarder with cache.
package rescached

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"net"

	libbytes "github.com/shuLhan/share/lib/bytes"
	"github.com/shuLhan/share/lib/dns"
	libio "github.com/shuLhan/share/lib/io"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	_maxQueue     = 512
	_maxForwarder = 4
)

var (
	DebugLevel byte = 0
)

// List of error messages.
var (
	ErrNetworkType = errors.New("Invalid network type")
)

// Server implement caching DNS server.
type Server struct {
	dnsServer *dns.Server
	nsParents []*net.UDPAddr
	reqQueue  chan *dns.Request
	fwQueue   chan *dns.Request
	fwStop    chan bool
	cw        *cacheWorker
	opts      *Options
}

//
// New create and initialize new rescached server.
//
func New(opts *Options) (*Server, error) {
	srv := &Server{
		dnsServer: new(dns.Server),
		reqQueue:  make(chan *dns.Request, _maxQueue),
		fwQueue:   make(chan *dns.Request, _maxQueue),
		fwStop:    make(chan bool),
		cw:        newCacheWorker(opts.CachePruneDelay, opts.CacheThreshold),
		opts:      opts,
	}

	if opts.ConnType != ConnTypeDoH && len(opts.FileResolvConf) > 0 {
		err := srv.loadResolvConf()
		if err != nil {
			log.Printf("! loadResolvConf: %s\n", err)
			srv.nsParents = srv.opts.NSParents
		}
	}

	fmt.Printf("= Name servers fallback: %v\n", srv.opts.NSParents)

	srv.dnsServer.Handler = srv

	srv.LoadHostsFile("")

	return srv, nil
}

//
// LoadHostsFile parse hosts formatted file and put it into caches.
//
func (srv *Server) LoadHostsFile(path string) {
	if len(path) == 0 {
		fmt.Println("= Loading system hosts file")
	} else {
		fmt.Printf("= Loading hosts file '%s'\n", path)
	}

	msgs, err := dns.HostsLoad(path)
	if err != nil {
		return
	}

	srv.populateCaches(msgs)
}

//
// LostMasterFile parse master file and put the result into caches.
//
func (srv *Server) LoadMasterFile(path string) {
	fmt.Printf("= Loading master file '%s'\n", path)

	msgs, err := dns.MasterLoad(path, "", 0)
	if err != nil {
		return
	}

	srv.populateCaches(msgs)
}

func (srv *Server) loadResolvConf() error {
	rc, err := libnet.NewResolvConf(srv.opts.FileResolvConf)
	if err != nil {
		return err
	}

	nsAddrs, err := dns.ParseNameServers(rc.NameServers)
	if err != nil {
		return err
	}

	if len(nsAddrs) > 0 {
		srv.nsParents = nsAddrs
	} else {
		srv.nsParents = srv.opts.NSParents
	}

	return nil
}

func (srv *Server) populateCaches(msgs []*dns.Message) {
	n := 0
	for x := 0; x < len(msgs); x++ {
		ok := srv.cw.add(msgs[x], true)
		if ok {
			n++
		}
		msgs[x] = nil
	}

	fmt.Printf("== %d record cached\n", n)
}

//
// ServeDNS handle DNS request from server.
//
func (srv *Server) ServeDNS(req *dns.Request) {
	srv.reqQueue <- req
}

//
// Start the server, waiting for DNS query from clients, read it and response
// it.
//
func (srv *Server) Start() (err error) {
	fmt.Printf("= Listening on '%s:%d'\n", srv.opts.ListenAddress,
		srv.opts.ListenPort)

	if len(srv.opts.FileCert) > 0 && len(srv.opts.FileCertKey) > 0 {
		fmt.Printf("= Listening on DoH '%s:%d'\n",
			srv.opts.ListenAddress, srv.opts.ListenDoHPort)
	}

	err = srv.runForwarders()
	if err != nil {
		return
	}

	if srv.opts.ConnType != ConnTypeDoH && len(srv.opts.FileResolvConf) > 0 {
		go srv.watchResolvConf()
	}

	go srv.cw.start()
	go srv.processRequestQueue()

	serverOptions := &dns.ServerOptions{
		IPAddress:   srv.opts.ListenAddress,
		UDPPort:     srv.opts.ListenPort,
		TCPPort:     srv.opts.ListenPort,
		DoHPort:     srv.opts.ListenDoHPort,
		DoHCertFile: srv.opts.FileCert,
		DoHKeyFile:  srv.opts.FileCertKey,
	}

	err = srv.dnsServer.ListenAndServe(serverOptions)

	return
}

func (srv *Server) runForwarders() (err error) {
	max := _maxForwarder

	if srv.opts.ConnType == ConnTypeDoH {
		fmt.Printf("= Name servers: %v\n", srv.opts.DoHParents)
	} else {
		fmt.Printf("= Name servers: %v\n", srv.nsParents)
		if len(srv.nsParents) > max {
			max = len(srv.nsParents)
		}
	}

	for x := 0; x < max; x++ {
		var (
			cl    dns.Client
			raddr *net.UDPAddr
		)

		switch srv.opts.ConnType {
		case ConnTypeUDP:
			nsIdx := x % len(srv.nsParents)
			raddr = srv.nsParents[nsIdx]
			cl, err = dns.NewUDPClient(raddr.String())
			if err != nil {
				log.Fatal("processForwardQueue: NewUDPClient:", err)
				return
			}

		case ConnTypeDoH:
			dohIdx := x % len(srv.opts.DoHParents)
			dohAddr := srv.opts.DoHParents[dohIdx]
			cl, err = dns.NewDoHClient(dohAddr, false)
			if err != nil {
				log.Fatal("processForwardQueue: NewDoHClient:", err)
				return
			}
		}

		go srv.processForwardQueue(cl, raddr)
	}
	return
}

func (srv *Server) stopForwarders() {
	srv.fwStop <- true
}

func (srv *Server) processRequestQueue() {
	var err error

	for req := range srv.reqQueue {
		if DebugLevel >= 1 {
			fmt.Printf("< request: %s\n", req.Message.Question)
		}

		// Check if request query name exist in cache.
		libbytes.ToLower(&req.Message.Question.Name)
		qname := string(req.Message.Question.Name)
		_, res := srv.cw.caches.get(qname, req.Message.Question.Type, req.Message.Question.Class)
		if res == nil {
			// Check and/or push if the same request already
			// forwarded before.
			dup := srv.cw.cachesRequest.push(qname, req)
			if dup {
				continue
			}

			srv.fwQueue <- req
			continue
		}

		if res.checkExpiration() {
			if DebugLevel >= 1 {
				fmt.Printf("- expired: %s\n", res.message.Question)
			}

			// Check and/or push if the same request already
			// forwarded before.
			dup := srv.cw.cachesRequest.push(qname, req)
			if dup {
				continue
			}

			srv.fwQueue <- req
			continue
		}

		res.message.SetID(req.Message.Header.ID)

		if req.Sender != nil {
			_, err = req.Sender.Send(res.message, req.UDPAddr)
			if err != nil {
				log.Println("! processRequestQueue: WriteToUDP:", err)
			}
		} else if req.ChanMessage != nil {
			req.ChanMessage <- res.message
		}

		// Ignore update on local caches
		if res.receivedAt == 0 {
			if DebugLevel >= 1 {
				fmt.Printf("= local  : %s\n", res.message.Question)
			}
			continue
		}

		srv.cw.updateQueue <- res
	}
}

func (srv *Server) processForwardQueue(cl dns.Client, raddr *net.UDPAddr) {
	var (
		err error
		msg *dns.Message
	)
	for {
		select {
		case req := <-srv.fwQueue:
			ok := false
			switch srv.opts.ConnType {
			case ConnTypeTCP:
				cl, err = dns.NewTCPClient(raddr.String())
				if err != nil {
					continue
				}

				msg, err = cl.Query(req.Message, nil)

				cl.Close()

			case ConnTypeUDP:
				msg, err = cl.Query(req.Message, raddr)

			case ConnTypeDoH:
				msg, err = cl.Query(req.Message, nil)
			}
			if err != nil {
				continue
			}

			if bytes.Equal(req.Message.Question.Name, msg.Question.Name) {
				if req.Message.Question.Type == msg.Question.Type {
					ok = true
				}
			}
			if !ok {
				if msg != nil {
					freeMessage(msg)
					msg = nil
				}
				continue
			}

			qname := string(req.Message.Question.Name)
			reqs := srv.cw.cachesRequest.pops(qname,
				req.Message.Question.Type, req.Message.Question.Class)

			for x := 0; x < len(reqs); x++ {
				msg.SetID(reqs[x].Message.Header.ID)

				if reqs[x].Sender != nil {
					_, err = reqs[x].Sender.Send(msg, reqs[x].UDPAddr)
					if err != nil {
						log.Println("! processForwardQueue: Send:", err)
					}
				} else if reqs[x].ChanMessage != nil {
					reqs[x].ChanMessage <- msg
				}
			}

			srv.cw.addQueue <- msg

		case <-srv.fwStop:
			return
		}
	}
}

func (srv *Server) watchResolvConf() {
	watcher, err := libio.NewWatcher(srv.opts.FileResolvConf, 0)
	if err != nil {
		log.Fatal("! watchResolvConf: ", err)
	}

	for fi := range watcher.C {
		if fi == nil {
			if srv.nsParents[0] == srv.opts.NSParents[0] {
				continue
			}

			log.Printf("= ResolvConf: file '%s' deleted\n",
				srv.opts.FileResolvConf)

			srv.nsParents = srv.opts.NSParents
		} else {
			err := srv.loadResolvConf()
			if err != nil {
				log.Printf("! loadResolvConf: %s\n", err)
				srv.nsParents = srv.opts.NSParents
			}
		}

		srv.stopForwarders()
		err = srv.runForwarders()
		if err != nil {
			log.Printf("! watchResolvConf: %s\n", err)
		}
	}
}
