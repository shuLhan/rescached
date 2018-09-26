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

	"github.com/shuLhan/rescached-go"
	"github.com/shuLhan/share/lib/dns"
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
	cfgKeyFileResolvConf  = "file.resolvconf"
	cfgKeyFileCert        = "server.file.certificate"
	cfgKeyFileCertKey     = "server.file.certificate.key"
	cfgKeyListenAddress   = "server.listen"
	cfgKeyListenPortDoH   = "server.listen.port.doh"
	cfgKeyNSNetwork       = "server.parent.connection"
	cfgKeyNSParent        = "server.parent"
	cfgKeyTimeout         = "server.timeout"
)

// List of default values.
const (
	defCachePruneDelay = 5 * time.Minute
	defCacheThreshold  = -1 * time.Hour
	defFilePID         = "rescached.pid"
	defListenAddress   = "127.0.0.1"
	defNSNetwork       = "udp"
	defPortDoHString   = "443"
	defTimeout         = 6
	defTimeoutString   = "6"
)

// List of default values.
var (
	defNameServers    = []string{"8.8.8.8:53", "8.8.4.4:53"}
	defDoHNameServers = []string{
		"https://1.1.1.1/dns-query",
	}
)

type config struct {
	connType        int
	filePID         string
	fileResolvConf  string
	fileDoHCert     string
	fileDoHCertKey  string
	nsParents       []*net.UDPAddr
	dohParents      []string
	listenAddress   string
	listenPort      uint16
	listenDoHPort   uint16
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
	cfg.fileResolvConf = cfg.in.GetString(cfgSecRescached, "", cfgKeyFileResolvConf, "")
	cfg.fileDoHCert = cfg.in.GetString(cfgSecRescached, "", cfgKeyFileCert, "")
	cfg.fileDoHCertKey = cfg.in.GetString(cfgSecRescached, "", cfgKeyFileCertKey, "")

	err = cfg.parseParentConnection()
	if err != nil {
		return nil, err
	}

	err = cfg.parseNSParent()
	if err != nil {
		return nil, err
	}

	err = cfg.parseListen()
	if err != nil {
		return nil, err
	}

	cfg.dirHosts = cfg.in.GetString(cfgSecRescached, "", "dir.hosts", "")
	cfg.dirMaster = cfg.in.GetString(cfgSecRescached, "", "dir.master", "")
	cfg.parseDoHPort()
	cfg.parseTimeout()
	cfg.parseCachePruneDelay()
	cfg.parseCacheThreshold()
	cfg.parseDebugLevel()
	cfg.in = nil

	return cfg, nil
}

func (cfg *config) parseNSParent() error {
	var nsParents []string

	v, ok := cfg.in.Get(cfgSecRescached, "", cfgKeyNSParent)
	if ok {
		nsParents = strings.Split(v, ",")
	}
	if cfg.connType == rescached.ConnTypeTCP || cfg.connType == rescached.ConnTypeUDP {
		nsParents = defNameServers
	}

	for _, ns := range nsParents {
		ns := strings.TrimSpace(ns)

		if strings.HasPrefix(ns, "https://") {
			cfg.dohParents = append(cfg.dohParents, ns)
			continue
		}

		addr, err := libnet.ParseUDPAddr(ns, dns.DefaultPort)
		if err != nil {
			return err
		}

		cfg.nsParents = append(cfg.nsParents, addr)
	}

	if cfg.connType == rescached.ConnTypeDoH {
		if len(cfg.dohParents) == 0 {
			cfg.dohParents = defDoHNameServers
		}
	}

	return nil
}

func (cfg *config) parseParentConnection() error {
	network := cfg.in.GetString(cfgSecRescached, "", cfgKeyNSNetwork, defNSNetwork)
	network = strings.ToLower(network)

	switch network {
	case "udp":
		cfg.connType = rescached.ConnTypeUDP
	case "tcp":
		cfg.connType = rescached.ConnTypeTCP
	case "doh":
		cfg.connType = rescached.ConnTypeDoH
	default:
		err := fmt.Errorf("Invalid network: '%s'", network)
		return err
	}

	return nil
}

func (cfg *config) parseListen() error {
	listen := cfg.in.GetString(cfgSecRescached, "", cfgKeyListenAddress, defListenAddress)

	ip, port, err := libnet.ParseIPPort(listen, dns.DefaultPort)
	if err != nil {
		return err
	}

	cfg.listenAddress = ip.String()
	cfg.listenPort = port

	return nil
}

func (cfg *config) parseDoHPort() {
	v := cfg.in.GetString(cfgSecRescached, "", cfgKeyTimeout, defPortDoHString)
	port, err := strconv.Atoi(v)
	if err != nil {
		port = int(dns.DefaultDoHPort)
	}

	cfg.listenDoHPort = uint16(port)
}

func (cfg *config) parseTimeout() {
	v := cfg.in.GetString(cfgSecRescached, "", cfgKeyTimeout, defTimeoutString)
	timeout, err := strconv.Atoi(v)
	if err != nil {
		timeout = defTimeout
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
