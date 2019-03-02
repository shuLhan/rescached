// Copyright 2019, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"regexp"
	"testing"
	"time"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var testCacheWorker = newCacheWorker(10*time.Second, -10*time.Second) // nolint: gochecknoglobals

func assertCaches(t *testing.T, exp string) {
	got := testCacheWorker.caches.String()
	re, err := regexp.Compile(exp)
	if err != nil {
		t.Fatal(err)
	}
	if !re.MatchString(got) {
		t.Fatalf("Expecting caches:\n\t%s\n got:\n%s\n", exp, got)
	}
}

func assertCachesList(t *testing.T, exp string) {
	re, err := regexp.Compile(exp)
	if err != nil {
		t.Fatal(err)
	}

	got := testCacheWorker.cachesList.String()
	if !re.MatchString(got) {
		t.Fatalf("Expecting cachesList:\n%s\n got:\n%s\n", exp, got)
	}
}

func TestCacheWorkerUpsert(t *testing.T) {
	cases := []struct {
		desc          string
		msg           *dns.Message
		isLocal       bool
		expReturn     bool
		expCaches     string
		expCachesList string
	}{{
		desc:          "With empty message",
		expCaches:     `^caches\[\]$`,
		expCachesList: `^cachesList\[\]$`,
	}, {
		desc: "With response code is not OK",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode: dns.RCodeErrFormat,
			},
		},
		expCaches:     `^caches\[\]$`,
		expCachesList: `^cachesList\[\]$`,
	}, {
		desc: "With new message, local - A",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode:   dns.RCodeOK,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte("local"),
				Type:  dns.QueryTypeA,
				Class: dns.QueryClassIN,
			},
		},
		isLocal:       true,
		expReturn:     true,
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\]\]$`,
		expCachesList: `^cachesList\[\]$`,
	}, {
		desc: "With new message, test1 - A",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode:   dns.RCodeOK,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte("test1"),
				Type:  dns.QueryTypeA,
				Class: dns.QueryClassIN,
			},
		},
		expReturn:     true,
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:A}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d+ \d+ &{Name:test1 Type:A}}\]$`,
	}, {
		desc: "With new message, different type, test1 - NS",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode:   dns.RCodeOK,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte("test1"),
				Type:  dns.QueryTypeNS,
				Class: dns.QueryClassIN,
			},
		},
		expReturn:     true,
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:A}} {\d+ \d+ &{Name:test1 Type:NS}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d+ \d+ &{Name:test1 Type:A}} &{\d+ \d+ &{Name:test1 Type:NS}}\]$`,                                              // nolint: lll
	}, {
		desc: "With updated message, test1 - A",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode:   dns.RCodeOK,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte("test1"),
				Type:  dns.QueryTypeA,
				Class: dns.QueryClassIN,
			},
		},
		expReturn:     true,
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:A}} {\d+ \d+ &{Name:test1 Type:NS}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d+ \d+ &{Name:test1 Type:NS}} &{\d+ \d+ &{Name:test1 Type:A}}\]$`,                                              // nolint: lll
	}, {
		desc: "With new message, test2 - A",
		msg: &dns.Message{
			Header: &dns.SectionHeader{
				RCode:   dns.RCodeOK,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte("test2"),
				Type:  dns.QueryTypeA,
				Class: dns.QueryClassIN,
			},
		},
		expReturn:     true,
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:A}} {\d+ \d+ &{Name:test1 Type:NS}}\] test2:\[{\d+ \d+ &{Name:test2 Type:A}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d+ \d+ &{Name:test1 Type:NS}} &{\d+ \d+ &{Name:test1 Type:A}} &{\d+ \d+ &{Name:test2 Type:A}}\]$`,                                                       // nolint: lll
	}}

	for _, c := range cases {
		t.Log(c.desc)

		gotReturn := testCacheWorker.upsert(c.msg, c.isLocal)

		test.Assert(t, "return value", c.expReturn, gotReturn, true)

		assertCaches(t, c.expCaches)
		assertCachesList(t, c.expCachesList)
	}

	first := testCacheWorker.cachesList.v.Front()
	if first != nil {
		res := first.Value.(*response)
		testCacheWorker.cachesList.fix(res)
	}
}

func TestCacheWorkerRemove(t *testing.T) {
	cases := []struct {
		desc          string
		el            *list.Element
		expCaches     string
		expCachesList string
	}{{
		desc:          "With nil response",
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:A}} {\d+ \d+ &{Name:test1 Type:NS}}\] test2:\[{\d+ \d+ &{Name:test2 Type:A}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d{10} \d{10} &{Name:test1 Type:A}} &{\d{10} \d{10} &{Name:test2 Type:A}} &{\d{10} \d{10} &{Name:test1 Type:NS}}\]$`,                                     // nolint: lll
	}, {
		desc:          "Removing one element",
		el:            testCacheWorker.cachesList.v.Front(),
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:NS}}\] test2:\[{\d+ \d+ &{Name:test2 Type:A}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d{10} \d{10} &{Name:test2 Type:A}} &{\d{10} \d{10} &{Name:test1 Type:NS}}\]$`,                                            // nolint: lll
	}}

	for _, c := range cases {
		var res *response

		t.Log(c.desc)

		if c.el != nil {
			v := testCacheWorker.cachesList.v.Remove(c.el)
			res = v.(*response)
			res.el = nil
		}

		testCacheWorker.remove(res)

		assertCaches(t, c.expCaches)
		assertCachesList(t, c.expCachesList)
	}
}

func TestCacheWorkerPrune(t *testing.T) {
	cases := []struct {
		desc          string
		res           *response
		expCaches     string
		expCachesList string
	}{{
		desc:          "With no items pruned",
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:NS}}\] test2:\[{\d+ \d+ &{Name:test2 Type:A}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d{10} \d{10} &{Name:test2 Type:A}} &{\d{10} \d{10} &{Name:test1 Type:NS}}\]$`,                                            // nolint: lll
	}, {
		desc:          "Pruning one element",
		res:           testCacheWorker.cachesList.v.Front().Value.(*response),
		expCaches:     `^caches\[local:\[{\d+ \d+ &{Name:local Type:A}}\] test1:\[{\d+ \d+ &{Name:test1 Type:NS}}\]\]$`, // nolint: lll
		expCachesList: `^cachesList\[&{\d+ \d+ &{Name:test1 Type:NS}}\]$`,                                               // nolint: lll
	}}

	for _, c := range cases {
		t.Log(c.desc)

		if c.res != nil {
			c.res.accessedAt = time.Now().Add(-20 * time.Second).Unix()
		}

		testCacheWorker.prune()

		assertCaches(t, c.expCaches)
		assertCachesList(t, c.expCachesList)
	}
}
