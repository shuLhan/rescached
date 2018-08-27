// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	"github.com/shuLhan/share/lib/dns"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defResolvConf = "/etc/resolv.conf"
)

func parseNameServers(nameservers []string) (udpAddrs []*net.UDPAddr) {
	for _, ns := range nameservers {
		addr, err := libnet.ParseUDPAddr(ns, dns.DefaultPort)
		if err != nil {
			log.Fatal(err)
		}
		udpAddrs = append(udpAddrs, addr)
	}
	return
}

func populateQueries(cr *libnet.ResolvConf, qname string) (queries []string) {
	names := strings.Split(qname, ".")

	if len(names) == cr.NDots+1 {
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

func main() {
	log.SetFlags(0)

	opts, err := newOptions()
	if err != nil {
		log.Fatal(err)
	}

	cl, err := dns.NewUDPClient(opts.nameserver)
	if err != nil {
		log.Fatal(err)
	}

	cr, err := libnet.NewResolvConf(defResolvConf)
	if err != nil {
		log.Fatal(err)
	}

	if len(cr.NameServers) == 0 {
		cr.NameServers = append(cr.NameServers, "127.0.0.1")
	}

	var (
		res        *dns.Message
		nameserver string
	)

	nsAddrs := parseNameServers(cr.NameServers)
	queries := populateQueries(cr, string(opts.qname))
	cl.Timeout = time.Duration(cr.Timeout) * time.Second

	fmt.Printf("= resolv.conf: %+v\n", cr)

	// The algorithm used is to try a name server, and  if  the  query
	// times out, try the next, until out of name servers, then repeat
	// trying all the name servers until a maximum number of retries are
	// made.)
	for _, qname := range queries {
		for x := 0; x < cr.Attempts; x++ {
			for _, addr := range nsAddrs {
				cl.Addr = addr
				nameserver = addr.String()

				fmt.Printf("> Lookup %s at %s\n", qname, nameserver)

				res, err = cl.Lookup(opts.qtype, opts.qclass, []byte(qname))
				if err != nil {
					log.Println(err)
					continue
				}
				if res.Header.ANCount == 0 {
					continue
				}

				goto out
			}
		}
	}

out:
	if res != nil {
		println(messagePrint(nameserver, res))
	}
}
