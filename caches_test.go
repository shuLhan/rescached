// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var _testCaches = newCaches()

func TestCachesPut(t *testing.T) {
	t.Logf("_testResponses[0]: %s\n", _testResponses[0])

	cases := []struct {
		desc   string
		res    *response
		expLen int
	}{{
		desc: "New",
		res: &response{
			msg: &dns.Message{
				Packet: []byte{1},
				Header: &dns.SectionHeader{
					ANCount: 1,
				},
				Question: &dns.SectionQuestion{
					Name:  []byte("1"),
					Type:  1,
					Class: 1,
				},
				Answer: []*dns.ResourceRecord{{
					TTL: 1,
				}},
			},
		},

		expLen: 1,
	}, {
		desc: "New",
		res: &response{
			msg: &dns.Message{
				Packet: []byte{2},
				Header: &dns.SectionHeader{
					ANCount: 1,
				},
				Question: &dns.SectionQuestion{
					Name:  []byte("2"),
					Type:  2,
					Class: 1,
				},
				Answer: []*dns.ResourceRecord{{
					TTL: 1,
				}},
			},
		},
		expLen: 2,
	}, {
		desc: "Replace",
		res: &response{
			msg: &dns.Message{
				Packet: []byte{1, 1},
				Header: &dns.SectionHeader{
					ANCount: 1,
				},
				Question: &dns.SectionQuestion{
					Name:  []byte("1"),
					Type:  1,
					Class: 1,
				},
				Answer: []*dns.ResourceRecord{{
					TTL: 1,
				}},
			},
		},
		expLen: 2,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		_testCaches.put(c.res)

		test.Assert(t, "Length", c.expLen, _testCaches.n, true)
	}
}

func TestCachesGet(t *testing.T) {
	cases := []struct {
		desc string
		req  *request
		exp  *response
	}{{
		desc: "Cache hit",
		req: &request{
			msg: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("1"),
					Type:  1,
					Class: 1,
				},
			},
		},
		exp: _testResponses[2],
	}, {
		desc: "Cache miss",
		req: &request{
			msg: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("1"),
					Type:  0,
					Class: 1,
				},
			},
		},
		exp: nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := _testCaches.get(c.req)

		test.Assert(t, "caches.get", c.exp, got, true)
	}
}
