// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS caching server.
package rescached

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"net"
	"time"

	libbytes "github.com/shuLhan/share/lib/bytes"
	"github.com/shuLhan/share/lib/dns"
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
	netType   libnet.Type
	dnsServer *dns.Server
	nsParents []*net.UDPAddr
	reqQueue  chan *dns.Request
	fwQueue   chan *dns.Request
	cw        *cacheWorker
}

//
// New create and initialize new rescached server.
//
func New(network string, nsParents []*net.UDPAddr, cachePruneDelay, cacheThreshold time.Duration) (
	srv *Server, err error,
) {
	netType := libnet.ConvertStandard(network)
	if !libnet.IsTypeTransport(netType) {
		return nil, ErrNetworkType
	}

	srv = &Server{
		netType:   netType,
		dnsServer: new(dns.Server),
		nsParents: nsParents,
		reqQueue:  make(chan *dns.Request, _maxQueue),
		fwQueue:   make(chan *dns.Request, _maxQueue),
		cw:        newCacheWorker(cachePruneDelay, cacheThreshold),
	}

	srv.dnsServer.Handler = srv

	srv.LoadHostsFile("")

	return
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
	fmt.Printf("= Loading master file %s\n", path)

	msgs, err := dns.MasterLoad(path, "", 0)
	if err != nil {
		return
	}

	srv.populateCaches(msgs)
}

func (srv *Server) populateCaches(msgs []*dns.Message) {
	n := 0
	for x := 0; x < len(msgs); x++ {
		ok := srv.cw.add(msgs[x], false)
		if ok {
			n++
		}
		msgs[x] = nil
	}

	fmt.Printf("== %d loaded\n", n)
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
func (srv *Server) Start(listenAddr string) (err error) {
	fmt.Printf("= Listening on %s\n", listenAddr)

	err = srv.runForwarders()
	if err != nil {
		return
	}

	go srv.cw.start()
	go srv.processRequestQueue()

	err = srv.dnsServer.ListenAndServe(listenAddr)

	return
}

func (srv *Server) runForwarders() (err error) {
	max := _maxForwarder
	if len(srv.nsParents) > max {
		max = len(srv.nsParents)
	}

	for x := 0; x < max; x++ {
		var cl dns.Client

		nsIdx := x % len(srv.nsParents)
		raddr := srv.nsParents[nsIdx]

		if libnet.IsTypeUDP(srv.netType) {
			cl, err = dns.NewUDPClient(raddr.String())
		}
		if err != nil {
			log.Fatal("processForwardQueue: NewClient:", err)
			return
		}

		go srv.processForwardQueue(cl, raddr)
	}
	return
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

		if res.isExpired() {
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

		_, err = req.Sender.Send(res.message, req.UDPAddr)
		if err != nil {
			log.Println("processRequestQueue: WriteToUDP:", err)
		}

		srv.dnsServer.FreeRequest(req)

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
		ok  bool
		err error
		msg *dns.Message
	)
	for req := range srv.fwQueue {
		ok = false
		if libnet.IsTypeTCP(srv.netType) {
			cl, err = dns.NewTCPClient(raddr.String())
			if err != nil {
				goto out
			}
		}

		_, err = cl.Send(req.Message, raddr)
		if err != nil {
			log.Println("processForwardQueue: Send:", err)
			goto out
		}

		msg = allocMessage()
		msg.Reset()

		_, err = cl.Recv(msg)
		if err != nil {
			log.Println("processForwardQueue: Recv:", err)
			goto out
		}

		err = msg.Unpack()
		if err != nil {
			log.Println("processForwardQueue: UnmarshalBinary:", err)
			goto out
		}

		if !bytes.Equal(req.Message.Question.Name, msg.Question.Name) {
			goto out
		}
		if req.Message.Header.ID != msg.Header.ID {
			goto out
		}
		if req.Message.Question.Type != msg.Question.Type {
			goto out
		}

		ok = true

	out:
		if libnet.IsTypeTCP(srv.netType) {
			if cl != nil {
				cl.Close()
			}
		}

		qname := string(req.Message.Question.Name)
		reqs := srv.cw.cachesRequest.pops(qname,
			req.Message.Question.Type, req.Message.Question.Class)

		for x := 0; x < len(reqs); x++ {
			if ok {
				msg.SetID(reqs[x].Message.Header.ID)

				_, err = reqs[x].Sender.Send(msg, reqs[x].UDPAddr)
				if err != nil {
					log.Println("! processForwardQueue: Send:", err)
				}
			}
			srv.dnsServer.FreeRequest(reqs[x])
		}

		if ok {
			srv.cw.addQueue <- msg
		} else {
			if msg != nil {
				freeMessage(msg)
				msg = nil
			}
		}
	}
}
