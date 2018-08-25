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
		res    *dns.Response
		expLen int
		exp    []*dns.Response
	}{{
		desc: "New",
		res:  _testResponses[0],
		exp: []*dns.Response{
			_testResponses[0],
		},
		expLen: 1,
	}, {
		desc: "New",
		res:  _testResponses[1],
		exp: []*dns.Response{
			_testResponses[0],
			_testResponses[1],
		},
		expLen: 2,
	}, {
		desc: "Replace",
		res:  _testResponses[2],
		exp: []*dns.Response{
			_testResponses[0],
			_testResponses[1],
			_testResponses[2],
		},
		expLen: 3,
	}}

	for _, c := range cases {
		t.Logf(c.desc)

		cres := _testListResponse.add(c.res)
		cres.accessedAt = 0

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
		exp    *cacheResponse
	}{{
		desc:   "Cache hit",
		qtype:  1,
		qclass: 1,
		exp: &cacheResponse{
			v: _testResponses[0],
		},
	}, {
		desc:   "Cache miss",
		qtype:  0,
		qclass: 1,
		exp:    nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := _testListResponse.get(c.qtype, c.qclass)

		test.Assert(t, "cacheResponse.get", c.exp, got, true)
	}
}
