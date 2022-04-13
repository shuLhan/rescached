// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

// Command resolver is client for DNS server to resolve query and client for
// rescached HTTP server.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
)

// List of valid commands.
const (
	cmdQuery = "query"
)

func main() {
	var (
		rsol = new(resolver)

		args    []string
		optHelp bool
	)

	log.SetFlags(0)

	flag.StringVar(&rsol.nameserver, "ns", "", "Parent name server address using scheme based.")
	flag.BoolVar(&rsol.insecure, "insecure", false, "Ignore invalid server certificate")
	flag.BoolVar(&optHelp, "h", false, "")

	flag.Parse()

	args = flag.Args()

	if optHelp {
		help()
		os.Exit(1)
	}

	if len(args) == 0 {
		help()
		os.Exit(1)
	}

	rsol.cmd = strings.ToLower(args[0])

	switch rsol.cmd {
	case cmdQuery:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s: missing argument", rsol.cmd)
		}

		rsol.doCmdQuery(args)

	default:
		log.Printf("resolver: unknown command: %s", rsol.cmd)
		os.Exit(2)
	}
}

func help() {
	fmt.Println(`
= resolver: command line interface for DNS and rescached server

==  Usage

	resolver [-ns nameserver] [-insecure] <command> <args>

==  Options

Accepted command is query.

-ns nameserver

	Parent name server address using scheme based.
	For example,
	udp://35.240.172.103:53 for querying with UDP,
	tcp://35.240.172.103:53 for querying with TCP,
	https://35.240.172:103:853 for querying with DNS over TLS (DoT), and
	https://kilabit.info/dns-query for querying with DNS over HTTPS (DoH).

-insecure

	Ignore invalid server certificate when querying DoT, DoH, or rescached
	server.

==  Commands

query <domain / ip-address> [type] [class]

	Query the domain or IP address with optional type and/or class.

	Unless the option "-ns" is given, the query command will use the
	nameserver defined in the system resolv.conf file.

	Valid type are either A, NS, CNAME, SOA, MB, MG, MR, NULL,
	WKS, PTR, HINFO, MINFO, MX, TXT, AAAA, or SRV.
	Default value is A."

	Valid class are either IN, CS, HS.
	Default value is IN.

==  Examples

Query the MX records using UDP on name server 35.240.172.103,

	$ resolver -ns udp://35.240.172.103 query kilabit.info MX

Query the IPv4 records of domain name "kilabit.info" using DNS over TLS on
name server 35.240.172.103,

	$ resolver -ns https://35.240.172.103 -insecure query kilabit.info

Query the IPv4 records of domain name "kilabit.info" using DNS over HTTPS on
name server kilabit.info,

	$ resolver -ns https://kilabit.info/dns-query query kilabit.info`)
}
