// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"net"
	"time"
)

type Options struct {
	ListenAddress   string
	ConnType        int
	NSParents       []*net.UDPAddr
	CachePruneDelay time.Duration
	CacheThreshold  time.Duration

	FilePID        string
	FileResolvConf string

	DoHParents []string
	DoHCert    string
	DoHCertKey string

	ListenPort uint16
	DoHPort    uint16

	DoHAllowInsecure bool
}
