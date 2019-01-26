// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var testCachesReq = newCachesRequest() // nolint: gochecknoglobals

func TestCachesRequestPush(t *testing.T) {
	cases := []struct {
		desc   string
		key    string
		req    *dns.Request
		expDup bool
		exp    string
	}{{
		desc: "With empty key",
		req:  testRequests[0],
		exp:  `cachesRequest[]`,
	}, {
		desc: "With empty request",
		key:  "1",
		exp:  `cachesRequest[]`,
	}, {
		desc: "With valid key and request (0)",
		key:  "0",
		req:  testRequests[0],
		exp:  `cachesRequest[0:[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}}]]`,
	}, {
		desc:   "With duplicate key and request",
		key:    "0",
		req:    testRequests[0],
		expDup: true,
		exp:    `cachesRequest[0:[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}} &{Kind:0 Message.Question:&{Name: Type:1 Class:1}}]]`,
	}, {
		desc:   "With valid key and request (1)",
		key:    "1",
		req:    testRequests[1],
		expDup: false,
		exp:    `cachesRequest[0:[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}} &{Kind:0 Message.Question:&{Name: Type:1 Class:1}}] 1:[&{Kind:0 Message.Question:&{Name: Type:2 Class:1}}]]`,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		gotDup := testCachesReq.push(c.key, c.req)

		test.Assert(t, "dup", c.expDup, gotDup, true)
		test.Assert(t, "String", c.exp, testCachesReq.String(), true)
	}
}

func TestCachesRequestPops(t *testing.T) {
	cases := []struct {
		desc          string
		key           string
		qtype, qclass uint16
		exp           []*dns.Request
	}{{
		desc:   "With empty key",
		qtype:  testRequests[0].Message.Question.Type,
		qclass: testRequests[0].Message.Question.Class,
	}, {
		desc:   "With invalid qtype",
		key:    "0",
		qtype:  0,
		qclass: testRequests[0].Message.Question.Class,
	}, {
		desc:   "With invalid qclass",
		key:    "0",
		qtype:  testRequests[0].Message.Question.Type,
		qclass: 0,
	}, {
		desc:   "With valid key, qtype, and qclass",
		key:    "0",
		qtype:  testRequests[0].Message.Question.Type,
		qclass: testRequests[0].Message.Question.Class,
		exp: []*dns.Request{
			testRequests[0],
			testRequests[0],
		},
	}, {
		desc:   "With valid key, qtype, and qclass (again)",
		key:    "0",
		qtype:  testRequests[0].Message.Question.Type,
		qclass: testRequests[0].Message.Question.Class,
	}, {
		desc:   "With valid key, qtype, and qclass",
		key:    "1",
		qtype:  testRequests[1].Message.Question.Type,
		qclass: testRequests[1].Message.Question.Class,
		exp: []*dns.Request{
			testRequests[1],
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := testCachesReq.pops(c.key, c.qtype, c.qclass)

		test.Assert(t, "list request", c.exp, got, true)
	}
}
