// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/shuLhan/share/lib/dns"
)

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
		fmt.Fprintf(&b, "\n> Answer %d", x)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %s", rr.RData())
	}
	for x, rr := range msg.Authority {
		fmt.Fprintf(&b, "\n> Authority %d", x)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %s", rr.RData())
	}
	for x, rr := range msg.Additional {
		fmt.Fprintf(&b, "\n> Additional %d", x)
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

	msg, err := cl.Lookup(opts.qtype, opts.qclass, []byte(opts.qname))
	if err != nil {
		log.Fatal(err)
	}

	println(messagePrint(opts.nameserver, msg))
}
