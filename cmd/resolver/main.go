// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/shuLhan/rescached-go/v4"
)

// List of valid commands.
const (
	cmdBlockd  = "block.d"
	cmdCaches  = "caches"
	cmdEnv     = "env"
	cmdHelp    = "help"
	cmdHostsd  = "hosts.d"
	cmdQuery   = "query"
	cmdVersion = "version"
	cmdZoned   = "zone.d"

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
	Usage string // Contains usage of program, overwritten by build.
)

func main() {
	var (
		rsol = new(resolver)

		args []string
	)

	log.SetFlags(0)

	flag.BoolVar(&rsol.insecure, "insecure", false, "Ignore invalid server certificate.")
	flag.StringVar(&rsol.nameserver, "ns", "", "Parent name server address using scheme based.")
	flag.StringVar(&rsol.rescachedUrl, "server", defRescachedUrl, "Set the rescached HTTP server.")

	flag.Parse()

	args = flag.Args()

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

	case cmdHelp:
		fmt.Println(Usage)
		os.Exit(1)

	case cmdHostsd:
		rsol.doCmdHostsd(args[1:])

	case cmdQuery:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s: missing argument", rsol.cmd)
		}

		rsol.doCmdQuery(args)

	case cmdVersion:
		fmt.Println(rescached.Version)

	case cmdZoned:
		args = args[1:]
		rsol.doCmdZoned(args)

	default:
		log.Printf("resolver: unknown command: %s", rsol.cmd)
		os.Exit(2)
	}
}
