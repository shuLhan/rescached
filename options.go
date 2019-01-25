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
	ConnType        int
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

	DoHAllowInsecure bool
}

//
// NewOptions create and initialize options with default values.
//
func NewOptions() *Options {
	return &Options{
		ConnType:        dns.ConnTypeUDP,
		Timeout:         5 * time.Second,
		CachePruneDelay: time.Hour,
		CacheThreshold:  -1 * time.Hour,
		FilePID:         "rescached.pid",
		ListenPort:      dns.DefaultPort,
	}
}
