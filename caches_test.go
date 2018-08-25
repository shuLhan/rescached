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

func TestCachesAdd(t *testing.T) {
	t.Logf("_testResponses[0]: %+v\n", _testResponses[0])

	cases := []struct {
		desc   string
		res    *dns.Response
		expLen uint64
	}{{
		desc: "New",
		res: &dns.Response{
			Message: &dns.Message{
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
		res: &dns.Response{
			Message: &dns.Message{
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
		res: &dns.Response{
			Message: &dns.Message{
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

		key := string(c.res.Message.Question.Name)
		cres := newCacheResponse(c.res)
		cres.accessedAt = 0

		_testCaches.add(key, cres)
	}
}

func TestCachesGet(t *testing.T) {
	cases := []struct {
		desc   string
		qname  string
		qtype  uint16
		qclass uint16
		req    *dns.Request
		exp    *cacheResponse
	}{{
		desc:   "Cache hit",
		qname:  "1",
		qtype:  1,
		qclass: 1,
		exp: &cacheResponse{
			v: _testResponses[2],
		},
	}, {
		desc:   "Cache miss",
		qname:  "1",
		qtype:  0,
		qclass: 1,
		exp:    nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		_, got := _testCaches.get(c.qname, c.qtype, c.qclass)

		test.Assert(t, "caches.get", c.exp, got, true)
	}
}
