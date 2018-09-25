// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"errors"
	"flag"
	"strings"

	"github.com/shuLhan/share/lib/dns"
	libnet "github.com/shuLhan/share/lib/net"
)

// List of error messages.
var (
	errQueryName  = errors.New("Missing or invalid query name")
	errQueryType  = errors.New("Unknown query type")
	errQueryClass = errors.New("Unknown query class")
)

// List of command line usages.
const (
	usageDoH        = `Query parent name server over HTTPS`
	usageNameServer = `Parent name server address, e.g. 192.168.1.1
without port, 192.168.1.1:53 with port.  Default port is 53.`

	usageType = `Query type.  Valid values are either A, NS, CNAME, SOA,
MB, MG, MR, NULL, WKS, PTR, HINFO, MINFO, MX, TXT, AAAA, or SRV.
Default value in A.`

	usageClass = `Query class.  Valid values are either IN, CS, HS.
Default value is IN.`
)

type options struct {
	sqtype  string
	sqclass string

	doh        bool
	nameserver string
	qname      string
	qtype      uint16
	qclass     uint16
}

func newOptions() (*options, error) {
	opts := new(options)

	flag.BoolVar(&opts.doh, "doh", false, usageDoH)
	flag.StringVar(&opts.nameserver, "ns", "", usageNameServer)
	flag.StringVar(&opts.sqtype, "t", "A", usageType)
	flag.StringVar(&opts.sqclass, "c", "IN", usageClass)

	flag.Parse()

	args := flag.Args()

	if len(args) == 0 {
		return nil, errQueryName
	}

	opts.qname = args[0]

	err := opts.parseNameServer()
	if err != nil {
		return nil, err
	}

	err = opts.parseQType()
	if err != nil {
		return nil, err
	}

	err = opts.parseQClass()
	if err != nil {
		return nil, err
	}

	return opts, nil
}

func (opts *options) parseNameServer() error {
	if len(opts.nameserver) == 0 {
		return nil
	}

	addr, err := libnet.ParseUDPAddr(opts.nameserver, dns.DefaultPort)
	if err != nil {
		return err
	}

	opts.nameserver = addr.String()

	return nil
}

func (opts *options) parseQType() error {
	var ok bool

	opts.sqtype = strings.ToUpper(opts.sqtype)

	opts.qtype, ok = dns.QueryTypes[opts.sqtype]
	if !ok {
		return errQueryType
	}

	return nil
}

func (opts *options) parseQClass() error {
	var ok bool

	opts.sqclass = strings.ToUpper(opts.sqclass)

	opts.qclass, ok = dns.QueryClasses[opts.sqclass]
	if !ok {
		return errQueryClass
	}

	return nil
}
