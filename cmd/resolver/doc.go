// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

/*
Program resolver is command line interface (CLI) for DNS and rescached server.

# SYNOPSIS

	resolver [-insecure] [-ns=<dns-URL>] [-server=<rescached-URL>] <command> [args...]

# DESCRIPTION

resolver is a tool to resolve hostname to IP address or to query services
on hostname by type (MX, SOA, TXT, etc.) using standard DNS protocol with UDP,
DNS over TLS (DoT), or DNS over HTTPS (DoH).

It is also provide CLI to the rescached server to manage environment, block.d,
hosts.d, and zone.d; as in the web user interface.

# OPTIONS

The following options affect the command operation.

	-insecure

Ignore invalid server certificate when querying DoT, DoH, or rescached
server.
This option only affect the `query` command.

	-ns=<dns-URL>

This option define the parent DNS server where the resolver send the query.
This option only affect the `query` command.

The nameserver is defined in the following format,

	("udp"/"tcp"/"https") "://" (domain / ip-address) [":" port]

Examples,

  - udp://194.233.68.184:53 for querying with UDP,
  - tcp://194.233.68.184:53 for querying with TCP,
  - https://194.233.68.184:853 for querying with DNS over TLS (DoT), and
  - https://kilabit.info/dns-query for querying with DNS over HTTPS (DoH).

Default to one of "nameserver" in `/etc/resolv.conf`.

	-server=<rescached-URL>

Set the rescached HTTP server where commands, except query, will be send.
The rescached-URL use HTTP scheme:

	("http" / "https") "://" (domain / ip-address) [":" port]

Default to https://127.0.0.1:5380 if its empty.

# COMMANDS

General commands,

	help    # Print this message.
	version # Print the program version.

Query the DNS server,

	query <domain / ip-address> [type] [class]

Managing block.d files,

	block.d                # List all hosts in block.d.
	block.d disable <name>
	block.d enable <name>
	block.d update <name>

Managing caches,

	caches
	caches search <string>
	caches remove <string>

Managing environment,

	env
	env update <path-to-file / "-">

Managing hosts.d files,

	hosts.d create <name>
	hosts.d get <name>

Managing record in hosts.d file,

	hosts.d rr add <name> <domain> <value>
	hosts.d rr delete <name> <domain>

Managing zone.d files,

	zone.d
	zone.d create <name>
	zone.d delete <name>

Managing record in zone.d,

	zone.d rr get <zone>
	zone.d rr add <zone> <"@" | subdomain> <ttl> <type> <class> <value> ...
	zone.d rr delete <zone> <"@" | subdomain> <type> <class> <value>

For more information see the manual page for resolver(1) or its HTML page at
http://127.0.0.1:5380/doc/resolver.html.
*/
package main
