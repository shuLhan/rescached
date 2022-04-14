// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/shuLhan/share/lib/dns"
	libhttp "github.com/shuLhan/share/lib/http"
)

// Client for rescached.
type Client struct {
	*libhttp.Client
}

// NewClient create new HTTP client that connect to rescached HTTP server.
func NewClient(serverUrl string, insecure bool) (cl *Client) {
	var (
		httpcOpts = libhttp.ClientOptions{
			ServerUrl:     serverUrl,
			AllowInsecure: insecure,
		}
	)
	cl = &Client{
		Client: libhttp.NewClient(&httpcOpts),
	}
	return cl
}

// Caches fetch all of non-local caches from server.
func (cl *Client) Caches() (answers []*dns.Answer, err error) {
	var (
		logp = "Caches"
		res  = libhttp.EndpointResponse{
			Data: &answers,
		}

		resb []byte
	)

	_, resb, err = cl.Get(apiCaches, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	err = json.Unmarshal(resb, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return answers, nil
}

// CachesSearch search the answer in caches by its domain name and return it
// as DNS message.
func (cl *Client) CachesSearch(q string) (listMsg []*dns.Message, err error) {
	var (
		logp   = "CachesSearch"
		params = url.Values{}
		res    = libhttp.EndpointResponse{
			Data: &listMsg,
		}

		path string
		resb []byte
	)

	params.Set(paramNameQuery, q)

	path = apiCachesSearch + "?" + params.Encode()
	fmt.Printf("%s: path: %s\n", logp, path)
	_, resb, err = cl.Get(path, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	err = json.Unmarshal(resb, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return listMsg, nil
}
