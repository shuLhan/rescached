// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/shuLhan/share/lib/ini"
	libnet "github.com/shuLhan/share/lib/net"
)

// List of config sections.
const (
	cfgSecRescached = "rescached"
)

// List of config keys.
const (
	cfgKeyCacheMax       = "cache.max"
	cfgKeyCacheThreshold = "cache.threshold"
	cfgKeyDebug          = "debug"
	cfgKeyFilePID        = "file.pid"
	cfgKeyHostsDir       = "hosts_d.path"
	cfgKeyListen         = "server.listen"
	cfgKeyNSNetwork      = "server.parent.connection"
	cfgKeyNSParent       = "server.parent"
	cfgKeyTimeout        = "server.timeout"
)

// List of default values.
const (
	defCacheMax       = 100000
	defCacheThreshold = 1
	defFilePID        = "rescached.pid"
	defHostsDir       = "/etc/rescached/hosts.d"
	defListen         = "127.0.0.1:53"
	defNSNetwork      = "udp"
	defPort           = 53
	defPortString     = "53"
	defTimeout        = 3
	defTimeoutString  = "3"
)

// List of default values.
var (
	defNSParent = []string{"8.8.8.8:53", "8.8.4.4:53"}
)

type config struct {
	filePID        string
	nsParents      []*net.UDPAddr
	nsNetwork      string
	listen         string
	timeout        time.Duration
	hostsDir       string
	cacheMax       uint32
	cacheThreshold uint32
	debugLevel     byte
}

func newConfig(file string) (cfg *config, err error) {
	cfg = new(config)

	in, err := ini.Open(file)
	if err != nil {
		return nil, err
	}

	cfg.filePID = in.GetString(cfgSecRescached, "", cfgKeyFilePID, defFilePID)

	err = cfg.parseNSParent(in)
	if err != nil {
		return nil, err
	}

	cfg.nsNetwork = in.GetString(cfgSecRescached, "", cfgKeyNSNetwork, defNSNetwork)
	cfg.listen = in.GetString(cfgSecRescached, "", cfgKeyListen, defListen)
	cfg.hostsDir = in.GetString(cfgSecRescached, "", cfgKeyHostsDir, defHostsDir)
	cfg.parseTimeout(in)
	cfg.parseCacheMax(in)
	cfg.parseCacheThreshold(in)
	cfg.parseDebugLevel(in)

	return
}

func (cfg *config) parseNSParent(in *ini.Ini) error {
	nsParents := defNSParent

	v, ok := in.Get(cfgSecRescached, "", cfgKeyNSParent)
	if ok {
		nsParents = strings.Split(v, ",")
	}

	for _, ns := range nsParents {
		addr, err := libnet.ParseUDPAddr(strings.TrimSpace(ns))
		if err != nil {
			return err
		}
		cfg.nsParents = append(cfg.nsParents, addr)
	}

	return nil
}

func (cfg *config) parseTimeout(in *ini.Ini) {
	v := in.GetString(cfgSecRescached, "", cfgKeyTimeout, defTimeoutString)
	timeout, err := strconv.Atoi(v)
	if err != nil {
		timeout = defTimeout
		return
	}

	cfg.timeout = time.Duration(timeout) * time.Second
}

func (cfg *config) parseCacheMax(in *ini.Ini) {
	v, ok := in.Get(cfgSecRescached, "", cfgKeyCacheMax)
	if !ok {
		cfg.cacheMax = defCacheMax
		return
	}

	cacheMax, err := strconv.ParseUint(v, 10, 32)
	if err != nil {
		cfg.cacheMax = defCacheMax
		return
	}

	cfg.cacheMax = uint32(cacheMax)
}

func (cfg *config) parseCacheThreshold(in *ini.Ini) {
	v, ok := in.Get(cfgSecRescached, "", cfgKeyCacheThreshold)
	if !ok {
		cfg.cacheThreshold = defCacheThreshold
		return
	}

	cacheThreshold, err := strconv.ParseUint(v, 10, 32)
	if err != nil {
		cfg.cacheThreshold = defCacheThreshold
		return
	}

	cfg.cacheThreshold = uint32(cacheThreshold)
}

func (cfg *config) parseDebugLevel(in *ini.Ini) {
	v, ok := in.Get(cfgSecRescached, "", cfgKeyDebug)
	if !ok {
		return
	}

	debug, err := strconv.Atoi(v)
	if err != nil {
		return
	}

	cfg.debugLevel = byte(debug)
}
