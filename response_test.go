// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"
	"time"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var _testResponses = []*response{{ // nolint
	accessedAt: 0,
	receivedAt: 0,
	message: &dns.Message{
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
}, {
	accessedAt: 1,
	receivedAt: time.Now().Unix() - 1,
	message: &dns.Message{
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
}, {
	accessedAt: 2,
	message: &dns.Message{
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
}}

func TestResponseAccessedAt(t *testing.T) {
	cases := []struct {
		desc string
		res  *response
		exp  int64
	}{{
		desc: "With accessedAt is 0",
		res:  _testResponses[0],
	}, {
		desc: "With accessedAt is 1",
		res:  _testResponses[1],
		exp:  1,
	}, {
		desc: "With accessedAt is 2",
		res:  _testResponses[2],
		exp:  2,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		test.Assert(t, "AccessedAt", c.exp, c.res.AccessedAt(), true)
	}
}

func TestResponseIsExpired(t *testing.T) {
	cases := []struct {
		desc string
		res  *response
		exp  bool
	}{{
		desc: "With local response",
		res:  _testResponses[0],
		exp:  false,
	}, {
		desc: "With one answer expired",
		res:  _testResponses[1],
		exp:  true,
	}, {
		desc: "With no expiration",
		res:  _testResponses[3],
		exp:  false,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		test.Assert(t, "isExpired", c.exp, c.res.isExpired(), true)
	}
}

func TestResponseUpdate(t *testing.T) {
	res := _testResponses[0]
	orgMsg := res.message

	cases := []struct {
		desc string
		msg  *dns.Message
		exp  *dns.Message
	}{{
		desc: "With empty message",
		exp:  _testResponses[0].message,
	}, {
		desc: "With non empty message",
		msg:  _testResponses[2].message,
		exp:  nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := res.update(c.msg)

		test.Assert(t, "update", c.exp, got, true)
	}

	res.message = orgMsg
}
