// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"log"
	"os"
	"testing"
	"time"

	libhttp "git.sr.ht/~shulhan/pakakeh.go/lib/http"
)

const (
	blockdServerAddress = "127.0.0.1:11180"
)

var (
	testEnv    *Environment
	testServer *Server
	resc       *Client
)

func TestMain(m *testing.M) {
	var (
		err        error
		testStatus int
		x          int
	)

	go mockBlockdServer()

	testEnv, err = LoadEnvironment("_test", "/etc/rescached/rescached.cfg")
	if err != nil {
		log.Fatal(err)
	}

	testServer, err = New(testEnv)
	if err != nil {
		log.Fatal(err)
	}

	err = testServer.Start()
	if err != nil {
		log.Fatal(err)
	}

	resc = NewClient("http://"+testEnv.WUIListen, false)

	// Loop 10 times until server ready for testing.
	for x = 0; x < 10; x++ {
		time.Sleep(500)
		_, err = resc.Env()
		if err != nil {
			continue
		}
		break
	}

	testStatus = m.Run()
	testServer.Stop()
	os.Exit(testStatus)
}

func mockBlockdServer() {
	var (
		serverOpts = libhttp.ServerOptions{
			Address: blockdServerAddress,
		}
		epHostsA = libhttp.Endpoint{
			Path:         "/hosts/a",
			Method:       libhttp.RequestMethodGet,
			RequestType:  libhttp.RequestTypeNone,
			ResponseType: libhttp.ResponseTypePlain,
			Call: func(_ *libhttp.EndpointRequest) ([]byte, error) {
				return []byte("127.0.0.2 a.block\n"), nil
			},
		}

		mockServer *libhttp.Server
		err        error
	)

	mockServer, err = libhttp.NewServer(serverOpts)
	if err != nil {
		log.Fatal(err)
	}

	err = mockServer.RegisterEndpoint(epHostsA)
	if err != nil {
		log.Fatal(err)
	}

	defer func() {
		err = mockServer.Stop(0)
		if err != nil {
			log.Fatal(err)
		}
	}()

	err = mockServer.Start()
	if err != nil {
		log.Println(err)
	}
}
