// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/ini"
	libnet "github.com/shuLhan/share/lib/net"

	rescached "github.com/shuLhan/rescached-go"
)

// List of config sections.
const (
	cfgSecRescached = "rescached"
)

func parseConfig(file string) (opts *rescached.Options, err error) {
	cfg, err := ini.Open(file)
	if err != nil {
		return nil, err
	}

	opts = rescached.NewOptions()

	opts.FilePID, _ = cfg.Get(cfgSecRescached, "", "file.pid", "rescached.pid")
	opts.FileResolvConf, _ = cfg.Get(cfgSecRescached, "", "file.resolvconf", "")

	dohCertFile, _ := cfg.Get(cfgSecRescached, "", "server.doh.certificate", "")
	dohPrivateKey, _ := cfg.Get(cfgSecRescached, "", "server.doh.certificate.key", "")
	opts.DoHAllowInsecure = cfg.GetBool(cfgSecRescached, "",
		"server.doh.allow_insecure", false)

	err = parseNSParent(cfg, opts)
	if err != nil {
		return nil, err
	}

	parseListen(cfg, opts)

	opts.DirHosts, _ = cfg.Get(cfgSecRescached, "", "dir.hosts", "")
	opts.DirMaster, _ = cfg.Get(cfgSecRescached, "", "dir.master", "")
	parseDoHPort(cfg, opts)
	parseTimeout(cfg, opts)
	parseCachePruneDelay(cfg, opts)
	parseCacheThreshold(cfg, opts)
	parseDebugLevel(cfg)

	if len(dohCertFile) > 0 && len(dohPrivateKey) > 0 {
		cert, err := tls.LoadX509KeyPair(dohCertFile, dohPrivateKey)
		if err != nil {
			return nil, fmt.Errorf("rescached: error loading certificate: " + err.Error())
		}
		opts.DoHCertificate = &cert
	}

	return opts, nil
}

func parseNSParent(cfg *ini.Ini, opts *rescached.Options) (err error) {
	parents := cfg.Gets(cfgSecRescached, "", "server.parent")

	for _, ns := range parents {
		ns = strings.TrimSpace(ns)
		if len(ns) > 0 {
			opts.NameServers = append(opts.NameServers, ns)
		}
	}

	return nil
}

func parseListen(cfg *ini.Ini, opts *rescached.Options) {
	listen, _ := cfg.Get(cfgSecRescached, "", "server.listen", "127.0.0.1")

	_, ip, port := libnet.ParseIPPort(listen, dns.DefaultPort)
	if ip == nil {
		log.Printf("Invalid server.listen: '%s', using default\n",
			listen)
		return
	}

	opts.IPAddress = ip.String()
	opts.Port = port
}

func parseDoHPort(cfg *ini.Ini, opts *rescached.Options) {
	v, _ := cfg.Get(cfgSecRescached, "", "server.doh.listen.port", "443")
	port, err := strconv.Atoi(v)
	if err != nil {
		port = int(dns.DefaultDoHPort)
	}

	opts.DoHPort = uint16(port)
}

func parseTimeout(cfg *ini.Ini, opts *rescached.Options) {
	v, _ := cfg.Get(cfgSecRescached, "", "server.timeout", "6")
	timeout, err := strconv.Atoi(v)
	if err != nil {
		return
	}

	opts.Timeout = time.Duration(timeout) * time.Second
}

func parseCachePruneDelay(cfg *ini.Ini, opts *rescached.Options) {
	v, ok := cfg.Get(cfgSecRescached, "", "cache.prune_delay", "")
	if !ok {
		return
	}

	v = strings.TrimSpace(v)

	var err error

	opts.PruneDelay, err = time.ParseDuration(v)
	if err != nil {
		return
	}
}

func parseCacheThreshold(cfg *ini.Ini, opts *rescached.Options) {
	v, ok := cfg.Get(cfgSecRescached, "", "cache.prune_threshold", "")
	if !ok {
		return
	}

	v = strings.TrimSpace(v)

	var err error

	opts.PruneThreshold, err = time.ParseDuration(v)
	if err != nil {
		return
	}
}

func parseDebugLevel(cfg *ini.Ini) {
	v, ok := cfg.Get(cfgSecRescached, "", "debug", "")
	if !ok {
		return
	}

	debug.Value, _ = strconv.Atoi(v)
}
