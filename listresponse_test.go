// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"strings"
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var _testListResponse = newListResponse(nil)

func TestListResponseAdd(t *testing.T) {
	cases := []struct {
		desc   string
		msg    *dns.Message
		expLen int
		exp    []*dns.Message
	}{{
		desc: "New",
		msg:  _testResponses[0].message,
		exp: []*dns.Message{
			_testResponses[0].message,
		},
		expLen: 1,
	}, {
		desc: "New",
		msg:  _testResponses[1].message,
		exp: []*dns.Message{
			_testResponses[0].message,
			_testResponses[1].message,
		},
		expLen: 2,
	}, {
		desc: "Replace",
		msg:  _testResponses[2].message,
		exp: []*dns.Message{
			_testResponses[0].message,
			_testResponses[1].message,
			_testResponses[2].message,
		},
		expLen: 3,
	}}

	for _, c := range cases {
		t.Logf(c.desc)

		res := _testListResponse.add(c.msg, true)
		res.accessedAt = 0

		test.Assert(t, "listResponse.Len", c.expLen, _testListResponse.v.Len(), true)

		var b strings.Builder
		b.WriteByte('[')
		for x, exp := range c.exp {
			if x > 0 {
				b.WriteByte(' ')
			}
			fmt.Fprintf(&b, "%+v", exp)
		}
		b.WriteByte(']')

		test.Assert(t, "listResponse", b.String(), _testListResponse.String(), true)
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
