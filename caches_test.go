// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var _testCaches = &caches{} // nolint

func TestCachesAdd(t *testing.T) {
	t.Logf("_testResponses[0]: %+v\n", _testResponses[0])

	cases := []struct {
		desc   string
		msg    *dns.Message
		expLen uint64
	}{{
		desc: "New",
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

		expLen: 1,
	}, {
		desc: "New",
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
		expLen: 2,
	}, {
		desc: "Replace",
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
		expLen: 2,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		key := string(c.msg.Question.Name)
		res := newResponse(c.msg)
		res.accessedAt = 0

		_testCaches.add(key, res)
	}
}

func TestCachesGet(t *testing.T) {
	cases := []struct {
		desc   string
		qname  string
		qtype  uint16
		qclass uint16
		exp    *response
	}{{
		desc:   "Cache hit",
		qname:  "1",
		qtype:  1,
		qclass: 1,
		exp:    _testResponses[2],
	}, {
		desc:   "Cache miss on qname",
		qname:  "3",
		qtype:  1,
		qclass: 1,
		exp:    nil,
	}, {
		desc:   "Cache miss on qtype",
		qname:  "1",
		qtype:  0,
		qclass: 1,
		exp:    nil,
	}, {
		desc:   "Cache miss on qclass",
		qname:  "1",
		qtype:  1,
		qclass: 0,
		exp:    nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		_, got := _testCaches.get(c.qname, c.qtype, c.qclass)
		if got == nil {
			test.Assert(t, "caches.get", c.exp, got, true)
			continue
		}

		test.Assert(t, "caches.get", c.exp.message, got.message, true)
	}
}

func TestCachesRemove(t *testing.T) {
	cases := []struct {
		desc   string
		qname  string
		qtype  uint16
		qclass uint16
		exp    *response
	}{{
		desc:   "With qname not exist",
		qname:  "3",
		qtype:  1,
		qclass: 1,
	}, {
		desc:   "With qtype not exist",
		qname:  "1",
		qtype:  0,
		qclass: 1,
	}, {
		desc:   "With qclass not exist",
		qname:  "1",
		qtype:  1,
		qclass: 0,
	}, {
		desc:   "With record exist",
		qname:  "1",
		qtype:  1,
		qclass: 1,
		exp:    _testResponses[2],
	}, {
		desc:   "With record exist, again",
		qname:  "1",
		qtype:  1,
		qclass: 1,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := _testCaches.remove(c.qname, c.qtype, c.qclass)
		if got == nil {
			test.Assert(t, "caches.remove", c.exp, got, true)
			continue
		}

		test.Assert(t, "caches.remove", c.exp.message, got.message, true)
	}
}
