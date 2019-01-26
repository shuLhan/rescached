// Copyright 2019, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"net"
	"testing"
	"time"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

func TestOptionsInit(t *testing.T) {
	cases := []struct {
		desc string
		opts *Options
		exp  *Options
	}{{
		desc: "With positive cache threshold",
		opts: &Options{
			CacheThreshold: time.Minute,
		},
		exp: &Options{
			ListenAddress: "127.0.0.1",
			ConnType:      dns.ConnTypeUDP,
			NSParents: []*net.UDPAddr{{
				IP:   net.ParseIP("1.1.1.1"),
				Port: int(dns.DefaultPort),
			}, {
				IP:   net.ParseIP("1.0.0.1"),
				Port: int(dns.DefaultPort),
			}},
			Timeout:         6 * time.Second,
			CachePruneDelay: time.Hour,
			CacheThreshold:  -1 * time.Minute,
			FilePID:         "rescached.pid",
			ListenPort:      dns.DefaultPort,
			DoHParents: []string{
				"https://cloudflare-dns.com/dns-query",
			},
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		c.opts.init()

		test.Assert(t, "Options.Init", c.exp, c.opts, true)
	}
}
