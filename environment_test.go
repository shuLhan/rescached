// Copyright 2019, Shulhan <m.shulhan@gmail.com>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"testing"

	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/ini"
	"github.com/shuLhan/share/lib/test"
)

func TestEnvironment(t *testing.T) {
	cases := []struct {
		desc     string
		content  string
		exp      *environment
		expError string
	}{{
		desc: "With empty content",
		exp:  &environment{},
	}, {
		desc: "With multiple parents",
		content: `[dns "server"]
listen = 127.0.0.1:53
parent = udp://35.240.172.103
parent = https://kilabit.info/dns-query
`,
		exp: &environment{
			ServerOptions: dns.ServerOptions{
				ListenAddress: "127.0.0.1:53",
				NameServers: []string{
					"udp://35.240.172.103",
					"https://kilabit.info/dns-query",
				},
			},
		},
	}}

	for _, c := range cases {
		t.Log(c.desc)

		got := &environment{
			ServerOptions: dns.ServerOptions{},
		}

		err := ini.Unmarshal([]byte(c.content), got)
		if err != nil {
			test.Assert(t, "error", c.expError, err.Error())
			continue
		}

		test.Assert(t, "environment", c.exp, got)
	}
}
