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
	cmdBlockd = "block.d"
	cmdCaches = "caches"
	cmdEnv    = "env"
	cmdHostsd = "hosts.d"
	cmdQuery  = "query"

	subCmdAdd     = "add"
	subCmdCreate  = "create"
	subCmdDelete  = "delete"
	subCmdDisable = "disable"
	subCmdEnable  = "enable"
	subCmdGet     = "get"
	subCmdRR      = "rr"
	subCmdRemove  = "remove"
	subCmdSearch  = "search"
	subCmdUpdate  = "update"
)

func main() {
	var (
		rsol = new(resolver)

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
	case cmdBlockd:
		rsol.doCmdBlockd(args[1:])

	case cmdCaches:
		rsol.doCmdCaches(args[1:])

	case cmdEnv:
		rsol.doCmdEnv(args[1:])

	case cmdHostsd:
		rsol.doCmdHostsd(args[1:])

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
= resolver

resolver is command line interface for DNS and rescached server

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

===  QUERY

query <domain / ip-address> [type] [class]

	Query the domain or IP address with optional type and/or class.

	Unless the option "-ns" is given, the query command will use the
	nameserver defined in the system resolv.conf file.

	Valid type are either A, NS, CNAME, SOA, MB, MG, MR, NULL,
	WKS, PTR, HINFO, MINFO, MX, TXT, AAAA, or SRV.
	Default value is A."

	Valid class are either IN, CS, HS.
	Default value is IN.


===  MANAGING BLOCK.D

block.d disable <name>

	Disable specific hosts on block.d.

block.d enable <name>

	Enable specific hosts on block.d.

block.d update <name>

	Fetch the latest hosts file from remote block.d URL defined by
	its name.
	On success, the hosts file will be updated and the server will be
	restarted.


===  MANAGING CACHES

caches

	Fetch and print all caches from rescached server.

caches search <string>

	Search the domain name in rescached caches.
	This command can also be used to inspect each DNS message on the
	caches.

caches remove <string>

	Remove the domain name from rescached caches.
	If the parameter is "all", it will remove all caches.


===  MANAGING ENVIRONMENT

env

	Fetch the current server environment and print it as JSON format to
	stdout.

env update <path-to-file / "-">

	Update the server environment from JSON formatted file.
	If the argument is "-", the new environment is read from stdin.
	If the environment is valid, the server will be restarted.


===  MANAGING HOSTS.D

hosts.d create <name>

	Create new hosts file inside the hosts.d directory with specific file
	name.

hosts.d delete <name>

	Delete hosts file inside the hosts.d directory by file name.

hosts.d get <name>

	Get the content of hosts file inside the hosts.d directory by file
	name.


===  MANAGING RECORD IN HOSTS.D

hosts.d rr add <name> <domain> <value>

	Insert a new record and save it to the hosts file identified by
	"name".
	If the domain name already exists, the new record will be appended
	instead of replaced.

hosts.d rr delete <name> <domain>

	Delete record from hosts file "name" by domain name.


==  Examples

===  QUERY

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


===  MANAGING CACHES

Inspect the rescached's caches on server at http://127.0.0.1:5380,

	$ resolver -server=http://127.0.0.1:5380 caches

Search caches that contains "bit" on the domain name,

	$ resolver caches search bit

Remove caches that contains domain name "kilabit.info",

	$ resolver caches remove kilabit.info

Remove all caches in the server,

	$ resolver caches remove all


===  MANAGING ENVIRONMENT

Fetch and print current server environment,

	$ resolver env

Update the server environment from JSON file in /tmp/env.json,

	$ resolver env update /tmp/env.json

Update the server environment by reading JSON from standard input,

	$ cat /tmp/env.json | resolver env update -


===  MANAGING HOSTS.D

Create new hosts file named "myhosts" inside the hosts.d directory,

	$ resolver hosts.d create myhosts
	OK

Delete hosts file named "myhosts" inside the hosts.d directory,

	$ resolver hosts.d delete myhosts
	OK

Get the content of hosts file named "myhosts" inside the hosts.d directory,

	$ resolver hosts.d get myhosts
	[
	  {
	    "Value": "127.0.0.1",
	    "Name": "localhost",
	    "Type": 1,
	    "Class": 1,
	    "TTL": 604800
	  },
	  {
	    "Value": "::1",
	    "Name": "localhost",
	    "Type": 28,
	    "Class": 1,
	    "TTL": 604800
	  }
	]


===  MANAGING RECORD IN HOSTS.D

Add new record "127.0.0.1 my.hosts" to hosts file named "hosts",

	$ resolver hosts.d rr add hosts my.hosts 127.0.0.1
	{
	  "Value": "127.0.0.1",
	  "Name": "my.hosts",
	  "Type": 1,
	  "Class": 1,
	  "TTL": 604800
	}

Delete record "my.hosts" from hosts file "hosts",

	$ resolver hosts.d rr delete hosts my.hosts
	{
	  "Value": "127.0.0.1",
	  "Name": "my.hosts",
	  "Type": 1,
	  "Class": 1,
	  "TTL": 604800
	}`)
}
