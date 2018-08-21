// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS caching server.
package rescached

import (
	"bytes"
	"fmt"
	"log"
	"net"

	"github.com/shuLhan/share/lib/dns"
)

const (
	_maxQueue     = 512
	_maxForwarder = 4
)

var (
	DebugLevel byte = 0
)

// Server implement caching DNS server.
type Server struct {
	nsParents []*net.UDPAddr
	udpc      *net.UDPConn
	reqQueue  chan *request
	fwQueue   chan *request
	resQueue  chan *response
}

//
// New create and initialize new rescached server.
//
func New(nsParents []*net.UDPAddr) (srv *Server, err error) {
	srv = &Server{
		nsParents: nsParents,
		reqQueue:  make(chan *request, _maxQueue),
		fwQueue:   make(chan *request, _maxQueue),
		resQueue:  make(chan *response, _maxQueue),
	}

	// Initialize caches and queue.
	if _caches == nil {
		_caches = newCaches()
	}

	LoadHostsFile("")

	return
}

//
// Start the server, waiting for DNS query from clients, read it and response
// it.
//
func (srv *Server) Start(listen *net.UDPAddr) (err error) {
	if DebugLevel >= 1 {
		fmt.Printf("= Listening on %s\n", listen)
	}

	srv.udpc, err = net.ListenUDP("udp", listen)
	if err != nil {
		return
	}

	err = srv.runForwarders()
	if err != nil {
		return
	}

	go srv.processRequestQueue()
	srv.handleIncomingClient()

	return
}

func (srv *Server) runForwarders() (err error) {
	for x := 0; x < _maxForwarder; x++ {
		var cl *dns.Client

		cl, err = dns.NewClient(nil)
		if err != nil {
			log.Fatal("processForwardQueue: NewClient:", err)
			return
		}

		for y := 0; y < len(srv.nsParents); y++ {
			cl.AddRemoteUDPAddr(srv.nsParents[y])
		}

		go srv.processForwardQueue(cl)
	}
	return
}

func (srv *Server) handleIncomingClient() {
	var (
		n   int
		err error
	)
	for {
		req := _requestPool.Get().(*request)

		n, req.raddr, err = srv.udpc.ReadFromUDP(req.msg.Packet)
		if err != nil {
			log.Println(err)
			continue
		}

		req.msg.Packet = req.msg.Packet[:n]

		srv.reqQueue <- req
	}
}

func (srv *Server) processRequestQueue() {
	var err error

	for req := range srv.reqQueue {
		req.msg.UnpackHeaderQuestion()

		if DebugLevel >= 1 {
			fmt.Printf("< request: %s\n", req.msg.Question)
		}

		// Check if request query name exist in cache.
		res := _caches.get(req)
		if res == nil {
			srv.fwQueue <- req
			continue
		}

		if res.isExpired() {
			if DebugLevel >= 1 {
				fmt.Printf("- expired: %s\n", res.msg.Answer[0])
			}

			srv.fwQueue <- req
			continue
		}

		if DebugLevel >= 1 {
			fmt.Printf("= cache  : %s\n", res.msg.Answer[0])
		}

		res.msg.SetID(req.msg.Header.ID)

		_, err = srv.udpc.WriteToUDP(res.msg.Packet, req.raddr)
		if err != nil {
			log.Println("processRequestQueue: WriteToUDP:", err)
		}

		freeRequest(req)
	}
}

func (srv *Server) processForwardQueue(cl *dns.Client) {
	var ok bool
	for req := range srv.fwQueue {
		err := cl.Send(req.msg, nil)
		if err != nil {
			log.Println("processForwardQueue: Send:", err)
			freeRequest(req)
			continue
		}

		res := _responsePool.Get().(*response)

		err = cl.Recv(res.msg)
		if err != nil {
			log.Println("processForwardQueue: Recv:", err)
			freeRequest(req)
			freeResponse(res)
			continue
		}

		err = res.unpack()
		if err != nil {
			log.Println("processForwardQueue: UnmarshalBinary:", err)
			freeRequest(req)
			freeResponse(res)
			continue
		}

		if !bytes.Equal(req.msg.Question.Name, res.msg.Question.Name) {
			freeRequest(req)
			freeResponse(res)
			continue
		}
		if req.msg.Header.ID != res.msg.Header.ID {
			freeRequest(req)
			freeResponse(res)
			continue
		}
		if req.msg.Question.Type != res.msg.Question.Type {
			freeRequest(req)
			freeResponse(res)
			continue
		}

		res.msg.SetID(req.msg.Header.ID)

		_, err = srv.udpc.WriteToUDP(res.msg.Packet, req.raddr)
		if err != nil {
			log.Println("processForwardQueue: WriteToUDP:", err)
			freeRequest(req)
			freeResponse(res)
			continue
		}

		freeRequest(req)
		ok = _caches.put(res)
		if !ok {
			freeResponse(res)
		}
	}
}
