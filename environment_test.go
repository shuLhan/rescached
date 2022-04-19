// SPDX-FileCopyrightText: 2019 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"bytes"
	"os"
	"testing"

	"github.com/shuLhan/share/lib/dns"
	libhttp "github.com/shuLhan/share/lib/http"
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

func TestLoadEnvironment(t *testing.T) {
	var (
		expEnv = &Environment{
			fileConfig: "cmd/rescached/rescached.cfg.test",

			WUIListen: "127.0.0.1:5381",
			HostsBlocks: map[string]*hostsBlock{
				"pgl.yoyo.org": &hostsBlock{
					Name: "pgl.yoyo.org",
					URL:  `http://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&startdate[day]=&startdate[month]=&startdate[year]=&mimetype=plaintext`,
				},
				"www.malwaredomainlist.com": &hostsBlock{
					Name: "www.malwaredomainlist.com",
					URL:  `http://www.malwaredomainlist.com/hostslist/hosts.txt`,
				},
				"winhelp2002.mvps.org": &hostsBlock{
					Name: "winhelp2002.mvps.org",
					URL:  `http://winhelp2002.mvps.org/hosts.txt`,
				},
				"someonewhocares.org": &hostsBlock{
					Name: "someonewhocares.org",
					URL:  `http://someonewhocares.org/hosts/hosts`,
				},
			},
			HttpdOptions: &libhttp.ServerOptions{
				Address: defWuiAddress,
			},
			ServerOptions: dns.ServerOptions{
				ListenAddress: "127.0.0.1:5350",
				NameServers: []string{
					"udp://10.8.0.1",
				},
				TLSAllowInsecure: true,
			},

			Debug: 2,
		}
		expBuffer []byte

		gotEnv    *Environment
		gotBuffer bytes.Buffer
		err       error
	)

	expBuffer, err = os.ReadFile("testdata/rescached.cfg.test.out")
	if err != nil {
		t.Fatal(err)
	}

	gotEnv, err = LoadEnvironment("cmd/rescached/rescached.cfg.test")
	if err != nil {
		t.Fatal(err)
	}

	gotEnv.HttpdOptions.Memfs = nil

	test.Assert(t, "LoadEnvironment", expEnv, gotEnv)

	gotEnv.HostsBlocks["test"] = &hostsBlock{
		Name: "test",
		URL:  "http://someurl",
	}

	err = gotEnv.Write(&gotBuffer)
	if err != nil {
		t.Fatal(err)
	}

	test.Assert(t, "Write", expBuffer, gotBuffer.Bytes())
}
