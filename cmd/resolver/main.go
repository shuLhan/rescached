// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

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
	cmdZoned  = "zone.d"

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

var (
	Usage string // Overwritten by build.
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
		fmt.Println(Usage)
		os.Exit(1)
	}

	if len(args) == 0 {
		fmt.Println(Usage)
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

	case cmdZoned:
		args = args[1:]
		rsol.doCmdZoned(args)

	default:
		log.Printf("resolver: unknown command: %s", rsol.cmd)
		os.Exit(2)
	}
}
