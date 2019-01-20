// Copyright 2019, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"
	"time"

	"github.com/shuLhan/share/lib/test"
)

func TestCachesListPush(t *testing.T) {
	testCachesList := newCachesList(0)

	cases := []struct {
		desc   string
		res    *response
		expLen int
		exp    []*response
	}{{
		desc: "With empty response",
	}, {
		desc: "With valid response",
		res: &response{
			accessedAt: 0,
		},
		expLen: 1,
		exp: []*response{
			{
				accessedAt: 0,
			},
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		testCachesList.push(c.res)

		test.Assert(t, "length", c.expLen, testCachesList.length(),
			true)

		got := testCachesList.items()
		for x, exp := range c.exp {
			test.Assert(t, "response.receivedAt", exp.receivedAt,
				got[x].receivedAt, true)
			test.Assert(t, "response.accessedAt", exp.accessedAt,
				got[x].accessedAt, true)
			test.Assert(t, "response.el", got[x].el, nil, false)
		}
	}
}

func TestCachesListFix(t *testing.T) {
	timeNow := time.Now().Unix()
	testCachesList := newCachesList(0)
	testResponses := []*response{{
		receivedAt: 0,
	}, {
		receivedAt: 1,
	}}

	cases := []struct {
		desc   string
		res    *response
		expLen int
		exp    []*response
	}{{
		desc: "With empty response",
	}, {
		desc:   "With response.receivedAt is 1",
		res:    testResponses[1],
		expLen: 1,
		exp: []*response{
			testResponses[1],
		},
	}, {
		desc:   "With response.receivedAt is 0",
		res:    testResponses[0],
		expLen: 2,
		exp: []*response{
			testResponses[1],
			testResponses[0],
		},
	}, {
		desc:   "With response.receivedAt is 1",
		res:    testResponses[1],
		expLen: 2,
		exp: []*response{
			testResponses[0],
			testResponses[1],
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		testCachesList.fix(c.res)

		test.Assert(t, "length", c.expLen, testCachesList.length(),
			true)

		got := testCachesList.items()
		for x, exp := range c.exp {
			test.Assert(t, "response.receivedAt", exp.receivedAt,
				got[x].receivedAt, true)
			test.Assert(t, "response.accessedAt",
				timeNow <= got[x].accessedAt, true, true)
			test.Assert(t, "response.el", got[x].el, nil, false)
		}
	}
}

func TestCachesListPrune(t *testing.T) {
	timeNow := time.Now().Unix()
	testCachesList := newCachesList(time.Minute)
	testResponses := []*response{{
		receivedAt: 0,
		accessedAt: timeNow - 60,
	}, {
		receivedAt: 1,
		accessedAt: timeNow - 59,
	}}

	for _, res := range testResponses {
		testCachesList.push(res)
	}

	got := testCachesList.prune()

	test.Assert(t, "length", 1, testCachesList.length(), true)

	for _, res := range got {
		test.Assert(t, "response.receivedAt", int64(0), res.receivedAt, true)
		test.Assert(t, "response.accessedAt", timeNow-60, res.accessedAt, true)
		test.Assert(t, "response.el", nil, res.el, false)
	}
}
