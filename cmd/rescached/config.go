// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
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
	cfgKeyCachePruneDelay = "cache.prune_delay"
	cfgKeyCacheThreshold  = "cache.threshold"
	cfgKeyDebug           = "debug"
	cfgKeyFilePID         = "file.pid"
	cfgKeyListen          = "server.listen"
	cfgKeyNSNetwork       = "server.parent.connection"
	cfgKeyNSParent        = "server.parent"
	cfgKeyTimeout         = "server.timeout"
)

// List of default values.
const (
	defCachePruneDelay = 5 * time.Minute
	defCacheThreshold  = -1 * time.Hour
	defFilePID         = "rescached.pid"
	defListen          = "127.0.0.1:53"
	defNSNetwork       = "udp"
	defPort            = 53
	defTimeout         = 6
	defTimeoutString   = "6"
)

// List of default values.
var (
	defNSParent = []string{"8.8.8.8:53", "8.8.4.4:53"}
)

type config struct {
	filePID         string
	nsParents       []*net.UDPAddr
	nsNetwork       string
	listen          string
	timeout         time.Duration
	dirHosts        string
	dirMaster       string
	cachePruneDelay time.Duration
	cacheThreshold  time.Duration
	debugLevel      byte
	in              *ini.Ini
}

func newConfig(file string) (*config, error) {
	var err error

	cfg := new(config)

	cfg.in, err = ini.Open(file)
	if err != nil {
		return nil, err
	}

	cfg.filePID = cfg.in.GetString(cfgSecRescached, "", cfgKeyFilePID, defFilePID)

	err = cfg.parseNSParent()
	if err != nil {
		return nil, err
	}

	cfg.nsNetwork = cfg.in.GetString(cfgSecRescached, "", cfgKeyNSNetwork, defNSNetwork)
	cfg.listen = cfg.in.GetString(cfgSecRescached, "", cfgKeyListen, defListen)
	cfg.dirHosts = cfg.in.GetString(cfgSecRescached, "", "dir.hosts", "")
	cfg.dirMaster = cfg.in.GetString(cfgSecRescached, "", "dir.master", "")
	cfg.parseTimeout()
	cfg.parseCachePruneDelay()
	cfg.parseCacheThreshold()
	cfg.parseDebugLevel()
	cfg.in = nil

	return cfg, nil
}

func (cfg *config) parseNSParent() error {
	nsParents := defNSParent

	v, ok := cfg.in.Get(cfgSecRescached, "", cfgKeyNSParent)
	if ok {
		nsParents = strings.Split(v, ",")
	}

	for _, ns := range nsParents {
		addr, err := libnet.ParseUDPAddr(strings.TrimSpace(ns), defPort)
		if err != nil {
			return err
		}
		cfg.nsParents = append(cfg.nsParents, addr)
	}

	return nil
}

func (cfg *config) parseTimeout() {
	v := cfg.in.GetString(cfgSecRescached, "", cfgKeyTimeout, defTimeoutString)
	timeout, err := strconv.Atoi(v)
	if err != nil {
		timeout = defTimeout
		return
	}

	cfg.timeout = time.Duration(timeout) * time.Second
}

func (cfg *config) parseCachePruneDelay() {
	v, ok := cfg.in.Get(cfgSecRescached, "", cfgKeyCachePruneDelay)
	if !ok {
		cfg.cachePruneDelay = defCachePruneDelay
		return
	}

	v = strings.TrimSpace(v)

	var err error

	cfg.cachePruneDelay, err = time.ParseDuration(v)
	if err != nil {
		cfg.cachePruneDelay = defCachePruneDelay
		return
	}

	if cfg.cachePruneDelay == 0 {
		cfg.cachePruneDelay = defCachePruneDelay
	}
}

func (cfg *config) parseCacheThreshold() {
	v, ok := cfg.in.Get(cfgSecRescached, "", cfgKeyCacheThreshold)
	if !ok {
		cfg.cacheThreshold = defCacheThreshold
		return
	}

	v = strings.TrimSpace(v)

	var err error

	cfg.cacheThreshold, err = time.ParseDuration(v)
	if err != nil {
		cfg.cacheThreshold = defCacheThreshold
		return
	}

	if cfg.cacheThreshold >= 0 {
		cfg.cacheThreshold = defCacheThreshold
	}
}

func (cfg *config) parseDebugLevel() {
	v, ok := cfg.in.Get(cfgSecRescached, "", cfgKeyDebug)
	if !ok {
		return
	}

	debug, err := strconv.Atoi(v)
	if err != nil {
		return
	}

	cfg.debugLevel = byte(debug)
}
