// Copyright 2019, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"net"
	"os"
	"regexp"
	"testing"
	"time"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/test"
)

var testServer *Server // nolint: gochecknoglobals

func TestMain(m *testing.M) {
	// Make debug counted on coverage
	debug.Value = 2

	// Add response for testing non-expired message, so we can check if
	// response.message.SubTTL work as expected.
	msg := dns.NewMessage()
	msg.Packet = []byte{
		// Header
		0x8c, 0xdb, 0x81, 0x80,
		0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		// Question
		0x07, 0x6b, 0x69, 0x6c, 0x61, 0x62, 0x69, 0x74,
		0x04, 0x69, 0x6e, 0x66, 0x6f, 0x00,
		0x00, 0x01, 0x00, 0x01,
		// Answer
		0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01,
		0x00, 0x00, 0x01, 0x68,
		0x00, 0x04,
		0x67, 0xc8, 0x04, 0xa2,
		// OPT
		0x00, 0x00, 0x29, 0x05, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	}
	err := msg.Unpack()
	if err != nil {
		log.Fatal(err)
	}

	res := newResponse(msg)
	_testResponses = append(_testResponses, res)

	testServer = New(nil)

	testServer.LoadHostsDir("testdata/hosts.d")
	testServer.LoadMasterDir("testdata/master.d")

	os.Exit(m.Run())
}

func TestNew(t *testing.T) {
	cases := []struct {
		desc         string
		opts         *Options
		expOpts      *Options
		expNSParents string
	}{{
		desc: "With nil options",
		expOpts: &Options{
			ListenAddress: "127.0.0.1",
			ConnType:      dns.ConnTypeUDP,
			NSParents: []*net.UDPAddr{{
				IP:   net.ParseIP("1.1.1.1"),
				Port: int(dns.DefaultPort),
			}, {
				IP:   net.ParseIP("1.0.0.1"),
				Port: int(dns.DefaultPort),
			}},
			Timeout:         6 * time.Second,
			CachePruneDelay: time.Hour,
			CacheThreshold:  -1 * time.Hour,
			FilePID:         "rescached.pid",
			ListenPort:      dns.DefaultPort,
			DoHParents: []string{
				"https://cloudflare-dns.com/dns-query",
			},
		},
		expNSParents: "[1.1.1.1:53 1.0.0.1:53]",
	}, {
		desc: "With resolv.conf file not exist",
		opts: &Options{
			FileResolvConf: "testdata/notexist",
		},
		expOpts: &Options{
			ListenAddress:   "127.0.0.1",
			ListenPort:      dns.DefaultPort,
			ConnType:        dns.ConnTypeUDP,
			Timeout:         6 * time.Second,
			CachePruneDelay: time.Hour,
			CacheThreshold:  -1 * time.Hour,
			FilePID:         "rescached.pid",
			FileResolvConf:  "testdata/notexist",
			NSParents: []*net.UDPAddr{{
				IP:   net.ParseIP("1.1.1.1"),
				Port: int(dns.DefaultPort),
			}, {
				IP:   net.ParseIP("1.0.0.1"),
				Port: int(dns.DefaultPort),
			}},
			DoHParents: []string{
				"https://cloudflare-dns.com/dns-query",
			},
		},
		expNSParents: "[1.1.1.1:53 1.0.0.1:53]",
	}, {
		desc: "With testdata/resolv.conf.empty",
		opts: &Options{
			FileResolvConf: "testdata/resolv.conf.empty",
		},
		expOpts: &Options{
			ListenAddress:   "127.0.0.1",
			ListenPort:      dns.DefaultPort,
			ConnType:        dns.ConnTypeUDP,
			Timeout:         6 * time.Second,
			CachePruneDelay: time.Hour,
			CacheThreshold:  -1 * time.Hour,
			FilePID:         "rescached.pid",
			FileResolvConf:  "testdata/resolv.conf.empty",
			NSParents: []*net.UDPAddr{{
				IP:   net.ParseIP("1.1.1.1"),
				Port: int(dns.DefaultPort),
			}, {
				IP:   net.ParseIP("1.0.0.1"),
				Port: int(dns.DefaultPort),
			}},
			DoHParents: []string{
				"https://cloudflare-dns.com/dns-query",
			},
		},
		expNSParents: "[1.1.1.1:53 1.0.0.1:53]",
	}, {
		desc: "With testdata/resolv.conf",
		opts: &Options{
			FileResolvConf: "testdata/resolv.conf",
		},
		expOpts: &Options{
			ListenAddress:   "127.0.0.1",
			ListenPort:      dns.DefaultPort,
			ConnType:        dns.ConnTypeUDP,
			Timeout:         6 * time.Second,
			CachePruneDelay: time.Hour,
			CacheThreshold:  -1 * time.Hour,
			FilePID:         "rescached.pid",
			FileResolvConf:  "testdata/resolv.conf",
			NSParents: []*net.UDPAddr{{
				IP:   net.ParseIP("1.1.1.1"),
				Port: int(dns.DefaultPort),
			}, {
				IP:   net.ParseIP("1.0.0.1"),
				Port: int(dns.DefaultPort),
			}},
			DoHParents: []string{
				"https://cloudflare-dns.com/dns-query",
			},
		},
		expNSParents: "[192.168.1.1:53]",
	}}

	for _, c := range cases {
		t.Log(c.desc)

		srv := New(c.opts)

		test.Assert(t, "Options", c.expOpts, srv.opts, true)
		gotNSParents := fmt.Sprintf("%s", srv.nsParents)
		test.Assert(t, "NSParents", c.expNSParents, gotNSParents, true)
	}
}

func TestLoadHostsDir(t *testing.T) {
	cases := []struct {
		desc      string
		dir       string
		expCaches string
	}{{
		desc:      "With empty directory",
		expCaches: `caches\[\]`,
	}, {
		desc:      "With directory not exist",
		dir:       "testdata/notexist",
		expCaches: `caches\[\]`,
	}, {
		desc:      "With non empty directory",
		dir:       "testdata/hosts.d",
		expCaches: `caches\[1.test:\[{0 \d+ &{Name:1.test Type:1 Class:1}}\] 2.test:\[{0 \d+ &{Name:2.test Type:1 Class:1}}\]\]`, // nolint: lll
	}}

	srv := New(nil)

	for _, c := range cases {
		t.Log(c.desc)

		srv.LoadHostsDir(c.dir)

		gotCaches := srv.cw.caches.String()
		re, err := regexp.Compile(c.expCaches)
		if err != nil {
			t.Fatal(err)
		}
		if !re.MatchString(gotCaches) {
			t.Fatalf("Expecting caches:\n\t%s\n got:\n%s\n",
				c.expCaches, gotCaches)
		}
	}
}

func TestLoadMasterDir(t *testing.T) {
	cases := []struct {
		desc      string
		dir       string
		expCaches string
	}{{
		desc:      "With empty directory",
		expCaches: `caches\[\]`,
	}, {
		desc:      "With directory not exist",
		dir:       "testdata/notexist",
		expCaches: `caches\[\]`,
	}, {
		desc:      "With non empty directory",
		dir:       "testdata/master.d",
		expCaches: `caches\[test.x:\[{0 \d+ &{Name:test.x Type:1 Class:1}}\]\]`, // nolint: lll
	}}

	srv := New(nil)

	for _, c := range cases {
		t.Log(c.desc)

		srv.LoadMasterDir(c.dir)

		gotCaches := srv.cw.caches.String()
		re, err := regexp.Compile(c.expCaches)
		if err != nil {
			t.Fatal(err)
		}
		if !re.MatchString(gotCaches) {
			t.Fatalf("Expecting caches:\n\t%s\n got:\n%s\n",
				c.expCaches, gotCaches)
		}
	}
}

func TestWritePID(t *testing.T) {
	cases := []struct {
		desc    string
		filePID string
		expErr  string
	}{{
		desc:   "With empty PID",
		expErr: "open : no such file or directory",
	}, {
		desc:    "With PID file not exist",
		filePID: "testdata/test.pid",
	}, {
		desc:    "With PID file exist",
		filePID: "testdata/test.pid",
		expErr:  "writePID: PID file 'testdata/test.pid' exist",
	}}

	srv := New(nil)

	srv.opts.FilePID = "testdata/test.pid"
	srv.RemovePID()

	for _, c := range cases {
		t.Log(c.desc)

		srv.opts.FilePID = c.filePID

		err := srv.WritePID()
		if err != nil {
			test.Assert(t, "error", c.expErr, err.Error(), true)
		}
	}
}

func TestProcessRequest(t *testing.T) {
	cases := []struct {
		desc             string
		req              *dns.Request
		expCachesRequest string
		expFw            *dns.Request
		expFwDoH         *dns.Request
	}{{
		desc:             "With nil request",
		expCachesRequest: `cachesRequest\[\]`,
	}, {
		desc: "With request type UDP and not exist in cache",
		req: &dns.Request{
			Kind: dns.ConnTypeUDP,
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("notexist"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
		expCachesRequest: `cachesRequest\[notexist:\[&{Kind:1 Message.Question:&{.*}}\]\]`,
		expFw: &dns.Request{
			Kind: dns.ConnTypeUDP,
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("notexist"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
	}, {
		desc: "With request type UDP and not exist in cache (again)",
		req: &dns.Request{
			Kind: dns.ConnTypeUDP,
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("notexist"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
		expCachesRequest: `cachesRequest\[notexist:\[&{.*} &{.*}\]\]`,
	}, {
		desc: "With request type DoH and not exist in cache",
		req: &dns.Request{
			Kind: dns.ConnTypeDoH,
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("doh"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
		expCachesRequest: `cachesRequest\[doh:\[&{.*}\] notexist:\[&{.*} &{.*}\]\]`,
		expFwDoH: &dns.Request{
			Kind: dns.ConnTypeDoH,
			Message: &dns.Message{
				Question: &dns.SectionQuestion{
					Name:  []byte("doh"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
	}, {
		desc: "With request type UDP and exist in cache",
		req: &dns.Request{
			Kind: dns.ConnTypeUDP,
			Message: &dns.Message{
				Header: &dns.SectionHeader{
					ID: 1000,
				},
				Question: &dns.SectionQuestion{
					Name:  []byte("1.test"),
					Type:  dns.QueryTypeA,
					Class: dns.QueryClassIN,
				},
			},
		},
		expCachesRequest: `cachesRequest\[doh:\[&{.*}\] notexist:\[&{.*} &{.*}\]\]`,
	}}

	for _, c := range cases {
		t.Log(c.desc)

		testServer.processRequest(c.req)

		// Wait for request to be send to cachesRequest.
		time.Sleep(100 * time.Millisecond)

		gotCachesRequest := testServer.cw.cachesRequest.String()
		re, err := regexp.Compile(c.expCachesRequest)
		if err != nil {
			t.Fatal(err)
		}
		if !re.MatchString(gotCachesRequest) {
			t.Fatalf("Expecting cachesRequest:\n%s,\ngot:\n%s\n",
				c.expCachesRequest, gotCachesRequest)
		}

		if c.expFw != nil {
			gotFw := <-testServer.fwQueue
			test.Assert(t, "forward queue", c.req, gotFw, true)
		}
		if c.expFwDoH != nil {
			gotFw := <-testServer.fwDoHQueue
			test.Assert(t, "forward DoH", c.req, gotFw, true)
		}
	}
}

//
// This test push request with UDP connection and read the response back.
//
func TestProcessRequestUDP(t *testing.T) {
	udpClient, err := dns.NewUDPClient("127.0.0.1:53")
	if err != nil {
		t.Fatal("TestProcessRequestQueueUDP:", err)
	}

	clLocalAddr := udpClient.Conn.LocalAddr().(*net.UDPAddr)

	cases := []struct {
		qname string
		exp   string
		id    uint16
		qtype uint16
	}{{
		id:    1000,
		qname: "1.test",
		qtype: dns.QueryTypeA,
		exp:   "127.0.0.1",
	}, {
		id:    1001,
		qname: "2.test",
		qtype: dns.QueryTypeA,
		exp:   "127.0.0.2",
	}, {
		id:    1002,
		qname: "test.x",
		qtype: dns.QueryTypeA,
		exp:   "127.0.0.3",
	}}

	for _, c := range cases {
		msg := &dns.Message{
			Header: &dns.SectionHeader{
				ID:      c.id,
				IsQuery: true,
				QDCount: 1,
			},
			Question: &dns.SectionQuestion{
				Name:  []byte(c.qname),
				Type:  c.qtype,
				Class: dns.QueryClassIN,
			},
		}

		_, err = msg.Pack()
		if err != nil {
			t.Fatal("msg.Pack:", err)
		}

		req := &dns.Request{
			Kind: dns.ConnTypeUDP,
			UDPAddr: &net.UDPAddr{
				IP:   net.IPv4(127, 0, 0, 1),
				Port: clLocalAddr.Port,
			},
			Sender:  udpClient,
			Message: msg,
		}

		testServer.processRequest(req)

		res := dns.NewMessage()

		_, err = udpClient.Recv(res)
		if err != nil {
			t.Fatal("udp client.Recv:", err)
		}

		err = res.Unpack()
		if err != nil {
			t.Fatal("dns.Message.Unpack:", err)
		}

		test.Assert(t, "id", c.id, res.Header.ID, true)

		got := string(res.Answer[0].RData().([]byte))
		test.Assert(t, "answer", c.exp, got, true)
	}
}
