// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"math/rand"
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
			log.Fatal("! parseNameServers: ", err)
		}
		udpAddrs = append(udpAddrs, addr)
	}
	return
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

func lookup(opts *options, ns string, timeout time.Duration, qname []byte) *dns.Message {
	var (
		cl  dns.Client
		err error
	)
	if opts.doh {
		cl, err = dns.NewDoHClient(ns, true)
		if err != nil {
			log.Fatal("! dns.NewDoHClient: ", err)
		}
	} else {
		cl, err = dns.NewUDPClient(ns)
		if err != nil {
			log.Fatal("! dns.NewUDPClient: ", err)
		}
	}

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
	log.SetFlags(0)

	opts, err := newOptions()
	if err != nil {
		log.Fatal("! newOptions: ", err)
	}

	fmt.Printf("= options: %+v\n", opts)

	cr, err := libnet.NewResolvConf(defResolvConf)
	if err != nil {
		log.Fatal("! NewResolvConf: ", err)
	}

	if len(opts.nameserver) > 0 {
		cr.NameServers = cr.NameServers[:0]
		cr.NameServers = append(cr.NameServers, opts.nameserver)
	} else if len(cr.NameServers) == 0 {
		cr.NameServers = append(cr.NameServers, "127.0.0.1:53")
	}

	var (
		res *dns.Message
		ns  string
	)

	nsAddrs := parseNameServers(cr.NameServers)
	queries := populateQueries(cr, opts.qname)
	timeout := time.Duration(cr.Timeout) * time.Second

	fmt.Printf("= resolv.conf: %+v\n", cr)

	// The algorithm used is to try a name server, and  if  the  query
	// times out, try the next, until out of name servers, then repeat
	// trying all the name servers until a maximum number of retries are
	// made.)
	for _, qname := range queries {
		for x := 0; x < cr.Attempts; x++ {
			for _, addr := range nsAddrs {
				if opts.doh {
					ns = fmt.Sprintf("https://%s/dns-query", addr.IP)
				} else {
					ns = addr.String()
				}

				fmt.Printf("> Lookup %s at %s\n", qname, ns)

				res = lookup(opts, ns, timeout, []byte(qname))
				if res != nil {
					goto out
				}
			}
		}
	}

out:
	if res != nil {
		println(messagePrint(ns, res))
	}
}
