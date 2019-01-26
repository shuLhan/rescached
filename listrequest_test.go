// Copyright 2019, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var testRequests = []*dns.Request{{ // nolint: gochecknoglobals
	Message: &dns.Message{
		Question: &dns.SectionQuestion{
			Type:  1,
			Class: 1,
		},
	},
}, {
	Message: &dns.Message{
		Question: &dns.SectionQuestion{
			Type:  2,
			Class: 1,
		},
	},
}, {
	Message: &dns.Message{
		Question: &dns.SectionQuestion{
			Type:  3,
			Class: 1,
		},
	},
}}

var testListRequest = newListRequest(testRequests[0]) // nolint: gochecknoglobals

func TestListRequestPush(t *testing.T) {
	cases := []struct {
		desc   string
		req    *dns.Request
		expLen int
		exp    string
	}{{
		desc:   "With empty request",
		expLen: 1,
		exp:    `[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}}]`,
	}, {
		desc:   "With non empty request (1)",
		req:    testRequests[1],
		expLen: 2,
		exp:    `[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}} &{Kind:0 Message.Question:&{Name: Type:2 Class:1}}]`,
	}, {
		desc:   "With non empty request (2)",
		req:    testRequests[2],
		expLen: 3,
		exp:    `[&{Kind:0 Message.Question:&{Name: Type:1 Class:1}} &{Kind:0 Message.Question:&{Name: Type:2 Class:1}} &{Kind:0 Message.Question:&{Name: Type:3 Class:1}}]`,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		testListRequest.push(c.req)

		test.Assert(t, "length", c.expLen, testListRequest.v.Len(), true)
		test.Assert(t, "String", c.exp, testListRequest.String(), true)
	}
}

func TestListRequestIsExist(t *testing.T) {
	cases := []struct {
		desc   string
		qtype  uint16
		qclass uint16
		exp    bool
	}{{
		desc:   "With qtype not found",
		qtype:  0,
		qclass: 1,
	}, {
		desc:   "With qclass not found",
		qtype:  1,
		qclass: 0,
	}, {
		desc:   "With qtype and qclass found",
		qtype:  1,
		qclass: 1,
		exp:    true,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := testListRequest.isExist(c.qtype, c.qclass)
		test.Assert(t, "IsExist", c.exp, got, true)
	}
}

func TestListRequestPops(t *testing.T) {
	cases := []struct {
		desc       string
		qtype      uint16
		qclass     uint16
		expIsEmpty bool
		expLen     int
		exp        []*dns.Request
	}{{
		desc:   "With qtype not found",
		qtype:  0,
		qclass: 1,
	}, {
		desc:   "With qclass not found",
		qtype:  1,
		qclass: 0,
	}, {
		desc:   "With qtype and qclass found (1)",
		qtype:  1,
		qclass: 1,
		expLen: 1,
		exp: []*dns.Request{
			testRequests[0],
		},
	}, {
		desc:   "With qtype and qclass found (2)",
		qtype:  2,
		qclass: 1,
		expLen: 1,
		exp: []*dns.Request{
			testRequests[1],
		},
	}, {
		desc:       "With qtype and qclass found (3)",
		qtype:      3,
		qclass:     1,
		expLen:     1,
		expIsEmpty: true,
		exp: []*dns.Request{
			testRequests[2],
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		gots, gotIsEmpty := testListRequest.pops(c.qtype, c.qclass)

		test.Assert(t, "IsEmpty", c.expIsEmpty, gotIsEmpty, true)
		test.Assert(t, "len", c.expLen, len(gots), true)

		for x, got := range gots {
			test.Assert(t, "request", c.exp[x], got, true)
		}
	}

}
