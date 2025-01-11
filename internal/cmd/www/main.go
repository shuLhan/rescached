// SPDX-FileCopyrightText: 2024 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

// Package www provides an HTTP server that serve the _www directory for
// testing.
// The web user interface can be run using existing rescached server by
// setting the SERVER value in class Rescached (_www/rescached.js).
package main

import (
	"flag"
	"log"

	"git.sr.ht/~shulhan/ciigo"
	"git.sr.ht/~shulhan/pakakeh.go/lib/memfs"
)

func main() {
	var flagAddress string

	flag.StringVar(&flagAddress, `address`, `127.0.0.1:6200`, `Listen address`)

	flag.Parse()

	var serveOpts = ciigo.ServeOptions{
		Mfs: &memfs.MemFS{
			Opts: &memfs.Options{
				Root:      `./_www`,
				TryDirect: true,
			},
		},
		ConvertOptions: ciigo.ConvertOptions{
			Root:         `./_www`,
			HTMLTemplate: `./_www/doc/html.tmpl`,
		},
		Address:       flagAddress,
		IsDevelopment: true,
	}

	var err = ciigo.Serve(serveOpts)
	if err != nil {
		log.Fatal(err)
	}
}
