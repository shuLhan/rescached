// SPDX-FileCopyrightText: 2019 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

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
		exp      *Environment
		expError string
	}{{
		desc: "With empty content",
		exp:  &Environment{},
	}, {
		desc: "With multiple parents",
		content: `[dns "server"]
listen = 127.0.0.1:53
parent = udp://35.240.172.103
parent = https://kilabit.info/dns-query
`,
		exp: &Environment{
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

		got := &Environment{
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
