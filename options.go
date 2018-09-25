// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"net"
	"time"
)

// List of known parent connection type.
const (
	ConnTypeUDP int = 1
	ConnTypeTCP int = 2
	ConnTypeDoH int = 4
)

type Options struct {
	ListenAddress   string
	ListenPort      uint16
	ListenDoHPort   uint16
	ConnType        int
	NSParents       []*net.UDPAddr
	DoHParents      []string
	CachePruneDelay time.Duration
	CacheThreshold  time.Duration
	FileResolvConf  string
	FileCert        string
	FileCertKey     string
}
