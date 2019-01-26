// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"net"
	"time"

	"github.com/shuLhan/share/lib/dns"
)

//
// Options for running rescached.
//
type Options struct {
	ListenAddress   string
	NSParents       []*net.UDPAddr
	Timeout         time.Duration
	CachePruneDelay time.Duration
	CacheThreshold  time.Duration

	FilePID        string
	FileResolvConf string
	DirHosts       string
	DirMaster      string

	DoHParents []string
	DoHCert    string
	DoHCertKey string

	ListenPort uint16
	DoHPort    uint16

	ConnType         dns.ConnType
	DoHAllowInsecure bool
}

//
// NewOptions create and initialize options with default values.
//
func NewOptions() *Options {
	return &Options{
		ListenAddress:   "127.0.0.1",
		ConnType:        dns.ConnTypeUDP,
		Timeout:         6 * time.Second,
		CachePruneDelay: time.Hour,
		CacheThreshold:  -1 * time.Hour,
		FilePID:         "rescached.pid",
		ListenPort:      dns.DefaultPort,
	}
}

//
// init check and initialize the options with default value if its empty.
//
func (opts *Options) init() {
	if len(opts.ListenAddress) == 0 {
		opts.ListenAddress = "127.0.0.1"
	}
	if opts.ConnType == 0 {
		opts.ConnType = dns.ConnTypeUDP
	}
	if len(opts.NSParents) == 0 {
		opts.NSParents = []*net.UDPAddr{{
			IP:   net.ParseIP("1.1.1.1"),
			Port: int(dns.DefaultPort),
		}, {
			IP:   net.ParseIP("1.0.0.1"),
			Port: int(dns.DefaultPort),
		}}
	}
	if opts.Timeout <= 0 || opts.Timeout > (6*time.Second) {
		opts.Timeout = 6 * time.Second
	}
	if opts.CachePruneDelay <= 0 {
		opts.CachePruneDelay = time.Hour
	}
	if opts.CacheThreshold == 0 {
		opts.CacheThreshold = -1 * time.Hour
	} else if opts.CacheThreshold > 0 {
		opts.CacheThreshold = -1 * opts.CacheThreshold
	}
	if len(opts.FilePID) == 0 {
		opts.FilePID = "rescached.pid"
	}
	if opts.ListenPort == 0 {
		opts.ListenPort = dns.DefaultPort
	}
	if len(opts.DoHParents) == 0 {
		opts.DoHParents = []string{
			"https://cloudflare-dns.com/dns-query",
		}
	}
}
