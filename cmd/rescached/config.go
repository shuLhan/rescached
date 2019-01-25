// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/ini"
	libnet "github.com/shuLhan/share/lib/net"

	"github.com/shuLhan/rescached-go"
)

// List of config sections.
const (
	cfgSecRescached = "rescached"
)

// List of config keys.
const (
	cfgKeyCachePruneDelay = "cache.prune_delay"
	cfgKeyCacheThreshold  = "cache.threshold"
	cfgKeyDebug           = "debug"
	cfgKeyFilePID         = "file.pid"
	cfgKeyFileResolvConf  = "file.resolvconf"
	cfgKeyListenAddress   = "server.listen"
	cfgKeyNSNetwork       = "server.parent.connection"
	cfgKeyNSParent        = "server.parent"
	cfgKeyTimeout         = "server.timeout"

	cfgKeyDoHAllowInsecure = "server.doh.allow_insecure"
	cfgKeyDoHCert          = "server.doh.certificate"
	cfgKeyDoHCertKey       = "server.doh.certificate.key"
	cfgKeyDoHParent        = "server.doh.parent"
)

func parseConfig(file string) (opts *rescached.Options, err error) {
	cfg, err := ini.Open(file)
	if err != nil {
		return nil, err
	}

	opts = rescached.NewOptions()

	opts.FilePID = cfg.GetString(cfgSecRescached, "", cfgKeyFilePID, "rescached.pid")
	opts.FileResolvConf = cfg.GetString(cfgSecRescached, "", cfgKeyFileResolvConf, "")
	opts.DoHCert = cfg.GetString(cfgSecRescached, "", cfgKeyDoHCert, "")
	opts.DoHCertKey = cfg.GetString(cfgSecRescached, "", cfgKeyDoHCertKey, "")
	opts.DoHAllowInsecure = cfg.GetBool(cfgSecRescached, "", cfgKeyDoHAllowInsecure, false)

	err = parseParentConnection(cfg, opts)
	if err != nil {
		return nil, err
	}

	err = parseNSParent(cfg, opts)
	if err != nil {
		return nil, err
	}

	err = parseDoHParent(cfg, opts)
	if err != nil {
		return nil, err
	}

	err = parseListen(cfg, opts)
	if err != nil {
		return nil, err
	}

	opts.DirHosts = cfg.GetString(cfgSecRescached, "", "dir.hosts", "")
	opts.DirMaster = cfg.GetString(cfgSecRescached, "", "dir.master", "")
	parseDoHPort(cfg, opts)
	parseTimeout(cfg, opts)
	parseCachePruneDelay(cfg, opts)
	parseCacheThreshold(cfg, opts)
	parseDebugLevel(cfg)

	return opts, nil
}

func parseNSParent(cfg *ini.Ini, opts *rescached.Options) (err error) {
	var nsParents []string

	v, ok := cfg.Get(cfgSecRescached, "", cfgKeyNSParent)
	if ok {
		nsParents = strings.Split(v, ",")
	}
	if len(nsParents) == 0 {
		nsParents = []string{"8.8.8.8:53", "8.8.4.4:53"}
	}

	for _, ns := range nsParents {
		ns := strings.TrimSpace(ns)

		addr, err := libnet.ParseUDPAddr(ns, dns.DefaultPort)
		if err != nil {
			return err
		}

		opts.NSParents = append(opts.NSParents, addr)
	}

	return nil
}

func parseDoHParent(cfg *ini.Ini, opts *rescached.Options) (err error) {
	var dohParents []string

	v, ok := cfg.Get(cfgSecRescached, "", cfgKeyDoHParent)
	if ok {
		dohParents = strings.Split(v, ",")
	}
	if len(dohParents) == 0 {
		dohParents = []string{"https://cloudflare-dns.com/dns-query"}
	}

	for _, ns := range dohParents {
		ns := strings.TrimSpace(ns)

		if !strings.HasPrefix(ns, "https://") {
			continue
		}
		_, err = url.Parse(ns)
		if err != nil {
			return err
		}

		opts.DoHParents = append(opts.DoHParents, ns)
	}

	return nil
}

func parseParentConnection(cfg *ini.Ini, opts *rescached.Options) (err error) {
	network := cfg.GetString(cfgSecRescached, "", cfgKeyNSNetwork, "udp")
	network = strings.ToLower(network)

	switch network {
	case "udp":
		opts.ConnType = dns.ConnTypeUDP
	case "tcp":
		opts.ConnType = dns.ConnTypeTCP
	default:
		return fmt.Errorf("Invalid network: '%s'", network)
	}

	return nil
}

func parseListen(cfg *ini.Ini, opts *rescached.Options) (err error) {
	listen := cfg.GetString(cfgSecRescached, "", cfgKeyListenAddress,
		"127.0.0.1")

	ip, port, err := libnet.ParseIPPort(listen, dns.DefaultPort)
	if err != nil {
		return err
	}

	opts.ListenAddress = ip.String()
	opts.ListenPort = port

	return nil
}

func parseDoHPort(cfg *ini.Ini, opts *rescached.Options) {
	v := cfg.GetString(cfgSecRescached, "", cfgKeyTimeout, "443")
	port, err := strconv.Atoi(v)
	if err != nil {
		port = int(dns.DefaultDoHPort)
	}

	opts.DoHPort = uint16(port)
}

func parseTimeout(cfg *ini.Ini, opts *rescached.Options) {
	v := cfg.GetString(cfgSecRescached, "", cfgKeyTimeout, "6")
	timeout, err := strconv.Atoi(v)
	if err != nil {
		timeout = 6
	}

	opts.Timeout = time.Duration(timeout) * time.Second
}

func parseCachePruneDelay(cfg *ini.Ini, opts *rescached.Options) {
	defCachePruneDelay := 1 * time.Hour

	v, ok := cfg.Get(cfgSecRescached, "", cfgKeyCachePruneDelay)
	if !ok {
		opts.CachePruneDelay = defCachePruneDelay
		return
	}

	v = strings.TrimSpace(v)

	var err error

	opts.CachePruneDelay, err = time.ParseDuration(v)
	if err != nil {
		opts.CachePruneDelay = defCachePruneDelay
		return
	}

	if opts.CachePruneDelay == 0 {
		opts.CachePruneDelay = defCachePruneDelay
	}
}

func parseCacheThreshold(cfg *ini.Ini, opts *rescached.Options) {
	defCacheThreshold := -1 * time.Hour

	v, ok := cfg.Get(cfgSecRescached, "", cfgKeyCacheThreshold)
	if !ok {
		opts.CacheThreshold = defCacheThreshold
		return
	}

	v = strings.TrimSpace(v)

	var err error

	opts.CacheThreshold, err = time.ParseDuration(v)
	if err != nil {
		opts.CacheThreshold = defCacheThreshold
		return
	}

	if opts.CacheThreshold >= 0 {
		opts.CacheThreshold = defCacheThreshold
	}
}

func parseDebugLevel(cfg *ini.Ini) {
	v, ok := cfg.Get(cfgSecRescached, "", cfgKeyDebug)
	if !ok {
		return
	}

	debug.Value, _ = strconv.Atoi(v)
}
