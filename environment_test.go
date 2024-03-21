// SPDX-FileCopyrightText: 2019 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"git.sr.ht/~shulhan/pakakeh.go/lib/dns"
	libhttp "git.sr.ht/~shulhan/pakakeh.go/lib/http"
	"git.sr.ht/~shulhan/pakakeh.go/lib/ini"
	"git.sr.ht/~shulhan/pakakeh.go/lib/test"
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
		testDirBase = "_test"
		expEnv      = &Environment{
			dirBase:        testDirBase,
			pathDirBlock:   filepath.Join(testDirBase, dirBlock),
			pathDirCaches:  filepath.Join(testDirBase, dirCaches),
			pathDirHosts:   filepath.Join(testDirBase, dirHosts),
			pathDirZone:    filepath.Join(testDirBase, dirZone),
			pathFileCaches: filepath.Join(testDirBase, dirCaches, fileCaches),

			fileConfig: filepath.Join(testDirBase, "/etc/rescached/rescached.cfg"),

			WUIListen: "127.0.0.1:5381",
			HostBlockd: map[string]*Blockd{
				"a.block": &Blockd{
					Name: "a.block",
					URL:  "http://127.0.0.1:11180/hosts/a",
				},
				"b.block": &Blockd{
					Name: "b.block",
					URL:  "http://127.0.0.1:11180/hosts/b",
				},
				"c.block": &Blockd{
					Name: "c.block",
					URL:  "http://127.0.0.1:11180/hosts/c",
				},
			},
			HttpdOptions: libhttp.ServerOptions{
				Address: "127.0.0.1:5381",
			},
			ServerOptions: dns.ServerOptions{
				ListenAddress: "127.0.0.1:5350",
				NameServers: []string{
					"udp://10.8.0.1",
				},
				TLSAllowInsecure: true,
			},
			Debug: 1,
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

	gotEnv, err = LoadEnvironment(testDirBase, "/etc/rescached/rescached.cfg")
	if err != nil {
		t.Fatal(err)
	}

	gotEnv.HttpdOptions.Memfs = nil

	test.Assert(t, "LoadEnvironment", expEnv, gotEnv)

	gotEnv.HostBlockd["test"] = &Blockd{
		Name: "test",
		URL:  "http://someurl",
	}

	err = gotEnv.Write(&gotBuffer)
	if err != nil {
		t.Fatal(err)
	}

	test.Assert(t, "Write", string(expBuffer), gotBuffer.String())
}
