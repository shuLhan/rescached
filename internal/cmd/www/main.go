// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2024 M. Shulhan <ms@kilabit.info>

// Package www provides an HTTP server that serve the _www directory for
// testing.
// The web user interface can be run using existing rescached server by
// setting the SERVER value in class Rescached (_www/rescached.js).
package main

import (
	"flag"
	"log"

	"kilabit.info/pakakeh.go/lib/http"
	"kilabit.info/pakakeh.go/lib/memfs"
	"kilabit.info/ciigo"
)

func main() {
	var flagAddress string

	flag.StringVar(&flagAddress, `address`, `127.0.0.1:6200`, `Listen address`)

	flag.Parse()

	var serveOpts = ciigo.ServeOptions{
		ServerOptions: http.ServerOptions{
			Memfs: &memfs.MemFS{
				Opts: &memfs.Options{
					Root:      `./_www`,
					TryDirect: true,
				},
			},
			Address: flagAddress,
		},
		IsDevelopment: true,
	}
	var convertOpts = ciigo.ConvertOptions{
		Root:         `./_www`,
		HTMLTemplate: `./_www/doc/html.tmpl`,
	}

	var err = ciigo.Serve(serveOpts, convertOpts)
	if err != nil {
		log.Fatal(err)
	}
}
