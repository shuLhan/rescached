// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package rescached implement DNS forwarder with cache.
package rescached

import (
	"bytes"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"

	libbytes "github.com/shuLhan/share/lib/bytes"
	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	libio "github.com/shuLhan/share/lib/io"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	_maxQueue     = 512
	_maxForwarder = 4
)

// List of error messages.
var (
	ErrNetworkType = errors.New("invalid network type")
)

// Server implement caching DNS server.
type Server struct {
	dnsServer  *dns.Server
	nsParents  []*net.UDPAddr
	reqQueue   chan *dns.Request
	fwQueue    chan *dns.Request
	fwDoHQueue chan *dns.Request
	fwStop     chan bool
	cw         *cacheWorker
	opts       *Options
}

//
// New create and initialize new rescached server.
//
func New(opts *Options) *Server {
	if opts == nil {
		opts = NewOptions()
	}

	opts.init()

	srv := &Server{
		dnsServer:  new(dns.Server),
		reqQueue:   make(chan *dns.Request, _maxQueue),
		fwQueue:    make(chan *dns.Request, _maxQueue),
		fwDoHQueue: make(chan *dns.Request, _maxQueue),
		fwStop:     make(chan bool),
		cw:         newCacheWorker(opts.CachePruneDelay, opts.CacheThreshold),
		opts:       opts,
	}

	if len(srv.opts.FileResolvConf) == 0 {
		srv.nsParents = srv.opts.NSParents
	} else {
		err := srv.loadResolvConf()
		if err != nil {
			log.Printf("! loadResolvConf: %s\n", err)
			srv.nsParents = srv.opts.NSParents
		}
	}

	srv.dnsServer.Handler = srv

	return srv
}

func (srv *Server) CachesStats() string {
	return fmt.Sprintf("= rescached: CachesStats{caches:%d cachesList:%d}",
		srv.cw.caches.length(), srv.cw.cachesList.length())
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
// LoadHostsDir load all host formatted files in directory.
//
func (srv *Server) LoadHostsDir(dir string) {
	if len(dir) == 0 {
		return
	}

	d, err := os.Open(dir)
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

		hostsFile := filepath.Join(dir, fis[x].Name())

		srv.LoadHostsFile(hostsFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
	}
}

//
// LoadMasterDir load all master formatted files in directory.
//
func (srv *Server) LoadMasterDir(dir string) {
	if len(dir) == 0 {
		return
	}

	d, err := os.Open(dir)
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

		masterFile := filepath.Join(dir, fis[x].Name())

		srv.LoadMasterFile(masterFile)
	}

	err = d.Close()
	if err != nil {
		log.Println("! loadHostsDir: Close:", err)
	}
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
		ok := srv.cw.upsert(msgs[x], true)
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
func (srv *Server) Start() error {
	fmt.Printf("= Listening on '%s:%d'\n", srv.opts.ListenAddress,
		srv.opts.ListenPort)

	err := srv.runForwarders()
	if err != nil {
		return err
	}

	if len(srv.opts.DoHCert) > 0 && len(srv.opts.DoHCertKey) > 0 {
		fmt.Printf("= DoH listening on '%s:%d'\n",
			srv.opts.ListenAddress, srv.opts.DoHPort)

		err = srv.runDoHForwarders()
		if err != nil {
			return err
		}
	}

	if len(srv.opts.FileResolvConf) > 0 {
		go srv.watchResolvConf()
	}

	go srv.cw.start()

	for x := 0; x < _maxForwarder; x++ {
		go srv.processRequestQueue()
	}

	serverOptions := &dns.ServerOptions{
		IPAddress:        srv.opts.ListenAddress,
		UDPPort:          srv.opts.ListenPort,
		TCPPort:          srv.opts.ListenPort,
		DoHPort:          srv.opts.DoHPort,
		DoHCert:          srv.opts.DoHCert,
		DoHCertKey:       srv.opts.DoHCertKey,
		DoHAllowInsecure: srv.opts.DoHAllowInsecure,
	}

	err = srv.dnsServer.ListenAndServe(serverOptions)

	return err
}

//
// Stop the server.
//
func (srv *Server) Stop() {
	srv.RemovePID()
	os.Exit(0)
}

//
// RemovePID remove server PID file.
//
func (srv *Server) RemovePID() {
	err := os.Remove(srv.opts.FilePID)
	if err != nil {
		log.Println(err)
	}
}

//
// WritePID will write current process PID to file `FilePID` only if the
// file is not exist, otherwise it will return an error.
//
func (srv *Server) WritePID() error {
	_, err := os.Stat(srv.opts.FilePID)
	if err == nil {
		return fmt.Errorf("writePID: PID file '%s' exist",
			srv.opts.FilePID)
	}

	pid := strconv.Itoa(os.Getpid())

	err = ioutil.WriteFile(srv.opts.FilePID, []byte(pid), 0400)

	return err
}

func (srv *Server) runForwarders() (err error) {
	max := _maxForwarder

	fmt.Printf("= Name servers: %v\n", srv.nsParents)

	if len(srv.nsParents) > max {
		max = len(srv.nsParents)
	}

	for x := 0; x < max; x++ {
		var (
			cl    dns.Client
			raddr *net.UDPAddr
		)

		nsIdx := x % len(srv.nsParents)
		raddr = srv.nsParents[nsIdx]

		if srv.opts.ConnType == dns.ConnTypeUDP {
			cl, err = dns.NewUDPClient(raddr.String())
			if err != nil {
				log.Fatal("runForwarders: NewUDPClient:", err)
				return
			}
		}

		go srv.processForwardQueue(cl, raddr)
	}
	return
}

func (srv *Server) runDoHForwarders() error {
	fmt.Printf("= DoH name servers: %v\n", srv.opts.DoHParents)

	for x := 0; x < len(srv.opts.DoHParents); x++ {
		cl, err := dns.NewDoHClient(srv.opts.DoHParents[x], srv.opts.DoHAllowInsecure)
		if err != nil {
			log.Fatal("runDoHForwarders: NewDoHClient:", err)
			return err
		}

		go srv.processDoHForwardQueue(cl)
	}

	return nil
}

func (srv *Server) stopForwarders() {
	srv.fwStop <- true
}

//
// processRequest process request from any connection, forward it to parent
// name server if no response from cache or if cache is expired; or send the
// cached response back to request.
//
func (srv *Server) processRequest(req *dns.Request) {
	if req == nil {
		return
	}
	if debug.Value >= 1 {
		fmt.Printf("< request:   Kind:%-4s ID:%-5d %s\n",
			dns.ConnTypeNames[req.Kind],
			req.Message.Header.ID, req.Message.Question)
	}

	// Check if request query name exist in cache.
	libbytes.ToLower(&req.Message.Question.Name)
	qname := string(req.Message.Question.Name)
	_, res := srv.cw.caches.get(qname, req.Message.Question.Type, req.Message.Question.Class)
	if res == nil || res.isExpired() {
		if req.Kind == dns.ConnTypeDoH {
			srv.fwDoHQueue <- req
		} else {
			srv.fwQueue <- req
		}
		return
	}

	srv.processRequestResponse(req, res.message)

	// Ignore update on local caches
	if res.receivedAt == 0 {
		if debug.Value >= 1 {
			fmt.Printf("= local  : ID:%-5d %s\n",
				res.message.Header.ID, res.message.Question)
		}
	} else {
		if debug.Value >= 1 {
			fmt.Printf("= cache  :  Total:%-4d ID:%-5d %s\n",
				srv.cw.cachesList.length(),
				res.message.Header.ID, res.message.Question)
		}

		srv.cw.cachesList.fix(res)
	}
}

func (srv *Server) processRequestResponse(req *dns.Request, res *dns.Message) {
	res.SetID(req.Message.Header.ID)

	switch req.Kind {
	case dns.ConnTypeUDP, dns.ConnTypeTCP:
		if req.Sender != nil {
			_, err := req.Sender.Send(res, req.UDPAddr)
			if err != nil {
				log.Println("! processRequest: Sender.Send:", err)
			}
		}

	case dns.ConnTypeDoH:
		if req.ResponseWriter != nil {
			_, err := req.ResponseWriter.Write(res.Packet)
			if err != nil {
				log.Println("! processRequest: ResponseWriter.Write:", err)
			}
			req.ChanResponded <- true
		}
	}
}

func (srv *Server) processRequestQueue() {
	for req := range srv.reqQueue {
		srv.processRequest(req)
	}
}

func (srv *Server) processForwardQueue(cl dns.Client, raddr net.Addr) {
	for {
		select {
		case req := <-srv.fwQueue:
			var (
				err error
				res *dns.Message
			)

			switch srv.opts.ConnType {
			case dns.ConnTypeUDP:
				res, err = cl.Query(req.Message, raddr)

			case dns.ConnTypeTCP:
				cl, err = dns.NewTCPClient(raddr.String())
				if err != nil {
					continue
				}

				res, err = cl.Query(req.Message, nil)

				cl.Close()
			}
			if err != nil {
				continue
			}

			srv.processForwardResponse(req, res)

		case <-srv.fwStop:
			return
		}
	}
}

func (srv *Server) processDoHForwardQueue(cl *dns.DoHClient) {
	for req := range srv.fwDoHQueue {
		res, err := cl.Query(req.Message, nil)
		if err != nil {
			continue
		}

		srv.processForwardResponse(req, res)
	}
}

func (srv *Server) processForwardResponse(req *dns.Request, res *dns.Message) {
	var ok bool

	if bytes.Equal(req.Message.Question.Name, res.Question.Name) {
		if req.Message.Question.Type == res.Question.Type {
			ok = true
		}
	}
	if !ok {
		return
	}

	srv.processRequestResponse(req, res)

	srv.cw.upsertQueue <- res
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
