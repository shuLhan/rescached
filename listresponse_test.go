// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var _testListResponse = newListResponse(nil) // nolint

func TestListResponseAdd(t *testing.T) {
	cases := []struct {
		desc   string
		msg    *dns.Message
		expLen int
		exp    string
	}{{
		desc:   "New",
		msg:    _testResponses[0].message,
		expLen: 1,
		exp:    `[{0 0 &{Name:1 Type:A}}]`,
	}, {
		desc:   "New",
		msg:    _testResponses[1].message,
		expLen: 2,
		exp:    `[{0 0 &{Name:1 Type:A}} {0 0 &{Name:2 Type:NS}}]`,
	}, {
		desc:   "Replace",
		msg:    _testResponses[2].message,
		expLen: 3,
		exp:    `[{0 0 &{Name:1 Type:A}} {0 0 &{Name:2 Type:NS}} {0 0 &{Name:1 Type:A}}]`,
	}}

	for _, c := range cases {
		t.Logf(c.desc)

		res := _testListResponse.add(c.msg, true)
		res.accessedAt = 0

		test.Assert(t, "listResponse.Len", c.expLen, _testListResponse.v.Len(), true)
		test.Assert(t, "listResponse", c.exp, _testListResponse.String(), true)
	}
}

func TestListResponseUpdate(t *testing.T) {
	testListResponse := newListResponse(nil)
	testResponse := &response{
		receivedAt: 0,
	}
	testMessages := []*dns.Message{{
		Packet: []byte{1},
	}, {
		Packet: []byte{2},
	}}

	cases := []struct {
		desc string
		res  *response
		msg  *dns.Message
		exp  *dns.Message
	}{{
		desc: "With empty response",
		msg:  &dns.Message{},
	}, {
		desc: "With empty message",
		res:  testResponse,
	}, {
		desc: "With nil return",
		res:  testResponse,
		msg:  testMessages[0],
	}, {
		desc: "With non nil return",
		res:  testResponse,
		msg:  testMessages[1],
		exp:  testMessages[0],
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := testListResponse.update(c.res, c.msg)

		test.Assert(t, "message", c.exp, got, true)
	}
}

func TestListResponseGet(t *testing.T) {
	cases := []struct {
		desc   string
		qtype  uint16
		qclass uint16
		exp    *response
	}{{
		desc:   "Cache hit",
		qtype:  1,
		qclass: 1,
		exp:    _testResponses[0],
	}, {
		desc:   "Cache miss",
		qtype:  0,
		qclass: 1,
		exp:    nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := _testListResponse.get(c.qtype, c.qclass)
		if got == nil {
			test.Assert(t, "response.get", c.exp, got, true)
			continue
		}

		test.Assert(t, "response.get", c.exp.message, got.message, true)
	}
}
