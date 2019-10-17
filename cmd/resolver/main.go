// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/shuLhan/share/lib/dns"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defResolvConf = "/etc/resolv.conf"
)

//
// initSystemResolver read the system resolv.conf to create fallback DNS
// resolver.
//
func initSystemResolver() (rc *libnet.ResolvConf, cl dns.Client) {
	var (
		err error
		ns  string
	)

	rc, err = libnet.NewResolvConf(defResolvConf)
	if err != nil {
		log.Fatal("! ", err)
	}

	if len(rc.NameServers) == 0 {
		ns = "127.0.0.1:53"
	} else {
		ns = rc.NameServers[0]
	}

	cl, err = dns.NewUDPClient(ns)
	if err != nil {
		log.Fatal("! ", err)
	}

	return
}

func createDNSClient(opts *options) (cl dns.Client) {
	var (
		ns     = opts.nameserver
		iphost string
		port   string
	)

	nsurl, err := url.Parse(ns)
	if err != nil {
		log.Fatalf("! invalid name server: %q\n", ns)
	}

	ipport := strings.Split(nsurl.Host, ":")
	switch len(ipport) {
	case 1:
		iphost = ipport[0]
	case 2:
		iphost = ipport[0]
		port = ipport[1]
	default:
		log.Fatalf("! invalid name server: %q\n", ns)
	}

	switch nsurl.Scheme {
	case "udp":
		cl, err = dns.NewUDPClient(nsurl.Host)
	case "tcp":
		cl, err = dns.NewTCPClient(nsurl.Host)
	case "https":
		ip := net.ParseIP(iphost)
		if ip != nil {
			if len(port) == 0 {
				port = "853"
			}
			cl, err = dns.NewDoTClient(iphost+":"+port, opts.insecure)
		} else {
			cl, err = dns.NewDoHClient(ns, opts.insecure)
		}
	default:
		log.Fatalf("! createDNSClient: unknown scheme %q", nsurl.Scheme)
	}
	if err != nil {
		log.Fatal("! createDNSClient: " + err.Error())
	}

	return cl
}

func populateQueries(cr *libnet.ResolvConf, qname string) (queries []string) {
	ndots := 0

	for _, c := range qname {
		if c == '.' {
			ndots++
			continue
		}
	}

	if ndots >= cr.NDots {
		queries = append(queries, qname)
	} else {
		if len(cr.Domain) > 0 {
			queries = append(queries, qname+"."+cr.Domain)
		}
		for _, s := range cr.Search {
			queries = append(queries, qname+"."+s)
		}
	}

	return
}

func messagePrint(nameserver string, msg *dns.Message) string {
	var b strings.Builder

	fmt.Fprintf(&b, "< From: %s", nameserver)
	fmt.Fprintf(&b, "\n> Header: %+v", msg.Header)
	fmt.Fprintf(&b, "\n> Question: %s", msg.Question)

	b.WriteString("\n> Status:")
	switch msg.Header.RCode {
	case dns.RCodeOK:
		b.WriteString(" OK")
	case dns.RCodeErrFormat:
		b.WriteString(" Invalid request format")
	case dns.RCodeErrServer:
		b.WriteString(" Server internal failure")
	case dns.RCodeErrName:
		b.WriteString(" Domain name did not exist")
	case dns.RCodeNotImplemented:
		b.WriteString(" Unknown query")
	case dns.RCodeRefused:
		b.WriteString(" Server refused the request")
	}

	if msg.Header.RCode != dns.RCodeOK {
		return b.String()
	}

	for x, rr := range msg.Answer {
		fmt.Fprintf(&b, "\n> Answer #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %s", rr.RData())
	}
	for x, rr := range msg.Authority {
		fmt.Fprintf(&b, "\n> Authority #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %s", rr.RData())
	}
	for x, rr := range msg.Additional {
		fmt.Fprintf(&b, "\n> Additional #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %s", rr.RData())
	}

	return b.String()
}

func lookup(opts *options, cl dns.Client, timeout time.Duration, qname []byte) *dns.Message {
	var (
		err error
	)

	rand.Seed(time.Now().Unix())

	cl.SetTimeout(timeout)

	req := dns.NewMessage()
	req.Header.ID = uint16(rand.Intn(65535))
	req.Question.Name = qname
	req.Question.Type = opts.qtype
	req.Question.Class = opts.qclass
	_, err = req.Pack()
	if err != nil {
		log.Fatal("! Pack:", err)
	}

	res, err := cl.Query(req)
	if err != nil {
		log.Println("! Lookup: ", err)
		return nil
	}

	if res.Header.RCode == 0 {
		return res
	}

	switch res.Header.RCode {
	case dns.RCodeErrFormat:
		log.Println("! ResponseCode: Format error")
	case dns.RCodeErrServer:
		log.Println("! ResponseCode: Server failure")
	case dns.RCodeErrName:
		log.Println("! ResponseCode: Domain not exist")
	case dns.RCodeNotImplemented:
		log.Println("! ResponseCode: Not implemented")
	case dns.RCodeRefused:
		log.Println("! ResponseCode: Refused")
	}
	return nil
}

func main() {
	var (
		cl  dns.Client
		rc  *libnet.ResolvConf
		res *dns.Message
		err error
	)

	log.SetFlags(0)

	rc, systemResolver := initSystemResolver()

	fmt.Printf("= resolv.conf: %+v\n", rc)

	opts, err := newOptions()
	if err != nil {
		log.Fatal("! ", err)
	}

	fmt.Printf("= options: %+v\n", opts)

	if len(opts.nameserver) == 0 {
		cl = systemResolver
	} else {
		cl = createDNSClient(opts)
	}

	queries := populateQueries(rc, opts.qname)
	timeout := time.Duration(rc.Timeout) * time.Second

	// The algorithm used is to try a name server, and  if  the  query
	// times out, try the next, until out of name servers, then repeat
	// trying all the name servers until a maximum number of retries are
	// made.)
	for _, qname := range queries {
		for x := 0; x < rc.Attempts; x++ {
			fmt.Printf("> Lookup %s at %s\n", qname, cl.RemoteAddr())

			res = lookup(opts, cl, timeout, []byte(qname))
			if res != nil {
				goto out
			}
		}
	}

out:
	if res != nil {
		println(messagePrint(cl.RemoteAddr(), res))
	}
}
