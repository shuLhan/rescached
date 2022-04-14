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
	cmdCaches = "caches"
	cmdQuery  = "query"

	subCmdSearch = "search"
	subCmdRemove = "remove"
)

func main() {
	var (
		rsol = new(resolver)

		subCmd  string
		args    []string
		optHelp bool
	)

	log.SetFlags(0)

	flag.BoolVar(&rsol.insecure, "insecure", false, "Ignore invalid server certificate.")
	flag.StringVar(&rsol.nameserver, "ns", "", "Parent name server address using scheme based.")
	flag.StringVar(&rsol.rescachedUrl, "server", defRescachedUrl, "Set the rescached HTTP server.")
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
	case cmdCaches:
		args = args[1:]
		if len(args) == 0 {
			rsol.doCmdCaches()
			return
		}

		subCmd = strings.ToLower(args[0])
		switch subCmd {
		case subCmdRemove:
			args = args[1:]
			if len(args) == 0 {
				log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
			}
			rsol.doCmdCachesRemove(args[0])

		case subCmdSearch:
			args = args[1:]
			if len(args) == 0 {
				log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
			}
			rsol.doCmdCachesSearch(args[0])

		default:
			log.Printf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
			os.Exit(2)
		}

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

	resolver [-insecure] [-ns nameserver] [-server] <command> [args...]

==  Options

The following options affect the commands operation.

-insecure

	Ignore invalid server certificate when querying DoT, DoH, or rescached
	server.

-ns nameserver

	Parent name server address using scheme based.
	For example,

	* udp://35.240.172.103:53 for querying with UDP,
	* tcp://35.240.172.103:53 for querying with TCP,
	* https://35.240.172:103:853 for querying with DNS over TLS (DoT), and
	* https://kilabit.info/dns-query for querying with DNS over HTTPS
	  (DoH).

-server <rescached-URL>

	Set the location of rescached HTTP server where commands will send.
	The rescached-URL use HTTP scheme:

		("http" / "https") "://" (domain / ip-address) [":" port]

	Default to "https://127.0.0.1:5380" if its empty.

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

caches

	Fetch and print all caches from rescached server.

caches search <string>

	Search the domain name in rescached caches.
	This command can also be used to inspect each DNS message on the
	caches.

caches remove <string>

	Remove the domain name from rescached caches.
	If the parameter is "all", it will remove all caches.


==  Examples

Query the IPv4 address for kilabit.info,

	$ resolver query kilabit.info

Query the mail exchange (MX) for domain kilabit.info,

	$ resolver query kilabit.info MX

Query the IPv4 address for kilabit.info using 127.0.0.1 at port 53 as
name server,

	$ resolver -ns=udp://127.0.0.1:53 query kilabit.info

Query the IPv4 address of domain name "kilabit.info" using DNS over TLS at
name server 194.233.68.184,

	$ resolver -insecure -ns=https://194.233.68.184 query kilabit.info

Query the IPv4 records of domain name "kilabit.info" using DNS over HTTPS on
name server kilabit.info,

	$ resolver -insecure -ns=https://kilabit.info/dns-query query kilabit.info

Inspect the rescached's caches on server at http://127.0.0.1:5380,

	$ resolver -server=http://127.0.0.1:5380 caches

Search caches that contains "bit" on the domain name,

	$ resolver -server=http://127.0.0.1:5380 caches search bit`)
}
