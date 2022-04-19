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

// BlockdUpdate fetch the latest hosts file from the hosts block
// provider based on registered URL.
func (cl *Client) BlockdUpdate(blockdName string) (an interface{}, err error) {
	var (
		logp  = "BlockdUpdate"
		hbReq = hostsBlock{
			Name: blockdName,
		}
		res = libhttp.EndpointResponse{}

		hb   *hostsBlock
		resb []byte
	)

	_, resb, err = cl.PostJSON(apiBlockdUpdate, nil, &hbReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	res.Data = &hb
	err = json.Unmarshal(resb, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return hb, nil
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

func (cl *Client) CachesRemove(q string) (listAnswer []*dns.Answer, err error) {
	var (
		logp   = "CachesRemove"
		params = url.Values{}
		res    = libhttp.EndpointResponse{
			Data: &listAnswer,
		}

		resb []byte
	)

	params.Set(paramNameName, q)

	_, resb, err = cl.Delete(apiCaches, nil, params)
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

	return listAnswer, nil
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

		resb []byte
	)

	params.Set(paramNameQuery, q)

	_, resb, err = cl.Get(apiCachesSearch, nil, params)
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

// Env get the server environment.
func (cl *Client) Env() (env *Environment, err error) {
	var (
		logp = "Env"
		res  = libhttp.EndpointResponse{
			Data: &env,
		}
		resb []byte
	)

	_, resb, err = cl.Get(apiEnvironment, nil, nil)
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
	return env, nil
}

// EnvUpdate update the server environment using new Environment.
func (cl *Client) EnvUpdate(envIn *Environment) (envOut *Environment, err error) {
	var (
		logp = "EnvUpdate"
		res  = libhttp.EndpointResponse{
			Data: &envOut,
		}

		resb []byte
	)

	_, resb, err = cl.PostJSON(apiEnvironment, nil, envIn)
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
	return envOut, nil
}
