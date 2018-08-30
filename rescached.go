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

	n := 0
	for x := 0; x < len(msgs); x++ {
		res := &dns.Response{
			// Flag to indicated that this response is from local
			// hosts file.
			ReceivedAt: 0,
			Message:    msgs[x],
		}

		ok := srv.cw.add(res, false)
		if !ok {
			freeResponse(res)
		} else {
			n++
		}
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
		_, cres := srv.cw.caches.get(qname, req.Message.Question.Type, req.Message.Question.Class)
		if cres == nil {
			// Check and/or push if the same request already
			// forwarded before.
			dup := srv.cw.cachesRequest.push(qname, req)
			if dup {
				continue
			}

			srv.fwQueue <- req
			continue
		}

		if cres.v.IsExpired() {
			if DebugLevel >= 1 {
				fmt.Printf("- expired: %s\n", cres.v.Message.Question)
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

		cres.v.Message.SetID(req.Message.Header.ID)

		_, err = req.Sender.Send(cres.v.Message, req.UDPAddr)
		if err != nil {
			log.Println("processRequestQueue: WriteToUDP:", err)
		}

		srv.dnsServer.FreeRequest(req)

		// Ignore update on local caches
		if cres.v.ReceivedAt == 0 {
			if DebugLevel >= 1 {
				fmt.Printf("= local  : %s\n", cres.v.Message.Question)
			}
			continue
		}

		srv.cw.updateQueue <- cres
	}
}

func (srv *Server) processForwardQueue(cl dns.Client, raddr *net.UDPAddr) {
	var (
		ok  bool
		err error
		res *dns.Response
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

		res = _responsePool.Get().(*dns.Response)
		res.Reset()

		_, err = cl.Recv(res.Message)
		if err != nil {
			log.Println("processForwardQueue: Recv:", err)
			goto out
		}

		err = res.Unpack()
		if err != nil {
			log.Println("processForwardQueue: UnmarshalBinary:", err)
			goto out
		}

		if !bytes.Equal(req.Message.Question.Name, res.Message.Question.Name) {
			goto out
		}
		if req.Message.Header.ID != res.Message.Header.ID {
			goto out
		}
		if req.Message.Question.Type != res.Message.Question.Type {
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
				res.Message.SetID(reqs[x].Message.Header.ID)

				_, err = reqs[x].Sender.Send(res.Message, reqs[x].UDPAddr)
				if err != nil {
					log.Println("! processForwardQueue: Send:", err)
				}
			}
			srv.dnsServer.FreeRequest(reqs[x])
		}

		if ok {
			srv.cw.addQueue <- res
		} else {
			if res != nil {
				freeResponse(res)
				res = nil
			}
		}
	}
}
