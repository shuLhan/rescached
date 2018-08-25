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

var _testCacheResponses = newCacheResponses(nil)

func TestCacheResponsesUpsert(t *testing.T) {
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
			_testResponses[1],
			_testResponses[2],
		},
		expLen: 2,
	}}

	for _, c := range cases {
		t.Logf(c.desc)

		_testCacheResponses.upsert(c.res)

		test.Assert(t, "listResponse.Len", c.expLen, _testCacheResponses.v.Len(), true)

		var b strings.Builder
		b.WriteByte('[')
		for x, exp := range c.exp {
			if x > 0 {
				b.WriteByte(' ')
			}
			fmt.Fprintf(&b, "%+v", exp)
		}
		b.WriteByte(']')

		test.Assert(t, "listResponse", b.String(), _testCacheResponses.String(), true)
	}
}

func TestCacheResponsesGet(t *testing.T) {
	cases := []struct {
		desc string
		req  *dns.Request
		exp  *dns.Response
	}{{
		desc: "Cache hit",
		req: &dns.Request{
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Type:  1,
					Class: 1,
				},
			},
		},
		exp: _testResponses[2],
	}, {
		desc: "Cache miss",
		req: &dns.Request{
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Type:  0,
					Class: 1,
				},
			},
		},
		exp: nil,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := _testCacheResponses.get(c.req)

		test.Assert(t, "cacheResponse.get", c.exp, got, true)
	}
}
