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
	caches    *caches
}

//
// New create and initialize new rescached server.
//
func New(network string, nsParents []*net.UDPAddr) (srv *Server, err error) {
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
		caches:    newCaches(),
	}

	srv.dnsServer.Handler = srv

	srv.LoadHostsFile("")

	return
}

//
// LoadHostsFile parse hosts formatted file and put it into caches.
//
func (srv *Server) LoadHostsFile(path string) {
	if DebugLevel >= 1 {
		if len(path) == 0 {
			log.Println("= Loading system hosts file")
		} else {
			log.Printf("= Loading hosts file '%s'", path)
		}
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

		ok := srv.caches.put(res)
		if !ok {
			freeResponse(res)
		} else {
			n++
		}
	}

	if DebugLevel >= 1 {
		log.Printf("== %d loaded\n", n)
	}
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
	if DebugLevel >= 1 {
		fmt.Printf("= Listening on %s\n", listenAddr)
	}

	err = srv.runForwarders()
	if err != nil {
		return
	}

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
		res := srv.caches.get(req)
		if res == nil {
			srv.fwQueue <- req
			continue
		}

		if res.IsExpired() {
			if DebugLevel >= 1 {
				fmt.Printf("- expired: %s\n", res.Message.Answer[0])
			}
			srv.fwQueue <- req
			continue
		}

		if DebugLevel >= 1 {
			fmt.Printf("= cache  : %s\n", res.Message.Answer[0])
		}

		res.Message.SetID(req.Message.Header.ID)

		_, err = req.Sender.Send(res.Message, req.UDPAddr)
		if err != nil {
			log.Println("processRequestQueue: WriteToUDP:", err)
		}

		srv.dnsServer.FreeRequest(req)
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
				srv.dnsServer.FreeRequest(req)
				continue
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

		res.Message.SetID(req.Message.Header.ID)
		ok = true

		_, err = req.Sender.Send(res.Message, req.UDPAddr)
		if err != nil {
			log.Println("processForwardQueue: Send:", err)
		}

	out:
		if libnet.IsTypeTCP(srv.netType) {
			if cl != nil {
				cl.Close()
			}
		}

		srv.dnsServer.FreeRequest(req)

		if ok {
			ok = srv.caches.put(res)
			if !ok {
				freeResponse(res)
			} else {
				if DebugLevel >= 1 {
					fmt.Printf("+ caching: %s\n", res.Message.Answer[0])
				}
			}
		}
	}
}
