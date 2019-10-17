// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"errors"
	"flag"
	"strings"

	"github.com/shuLhan/share/lib/dns"
)

// List of error messages.
var (
	errQueryName  = errors.New("invalid or empty query name")
	errQueryType  = errors.New("unknown query type")
	errQueryClass = errors.New("unknown query class")
)

// List of command line usages.
const (
	usageInsecure   = `skip verifying server certificate`
	usageNameServer = `Parent name server address using scheme based.
For example,
udp://35.240.172.103:53 for querying with UDP,
tcp://35.240.172.103:53 for querying with TCP,
https://35.240.172:103:853 for querying with DNS over TLS, and
https://kilabit.info/dns-query for querying with DNS over HTTPS.`

	usageType = `Query type.  Valid values are either A, NS, CNAME, SOA,
MB, MG, MR, NULL, WKS, PTR, HINFO, MINFO, MX, TXT, AAAA, or SRV.
Default value is A.`

	usageClass = `Query class.  Valid values are either IN, CS, HS.
Default value is IN.`
)

type options struct {
	sqtype  string
	sqclass string

	nameserver string
	insecure   bool
	qname      string
	qtype      uint16
	qclass     uint16
}

func newOptions() (*options, error) {
	opts := new(options)

	flag.StringVar(&opts.nameserver, "ns", "", usageNameServer)
	flag.BoolVar(&opts.insecure, "insecure", false, usageInsecure)
	flag.StringVar(&opts.sqtype, "t", "A", usageType)
	flag.StringVar(&opts.sqclass, "c", "IN", usageClass)

	flag.Parse()

	args := flag.Args()

	if len(args) == 0 {
		return nil, errQueryName
	}

	opts.qname = args[0]

	err := opts.parseQType()
	if err != nil {
		return nil, err
	}

	err = opts.parseQClass()
	if err != nil {
		return nil, err
	}

	return opts, nil
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
