// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"git.sr.ht/~shulhan/pakakeh.go/lib/dns"
	libhttp "git.sr.ht/~shulhan/pakakeh.go/lib/http"
)

// Client for rescached.
type Client struct {
	*libhttp.Client
}

// NewClient create new HTTP client that connect to rescached HTTP server.
func NewClient(serverURL string, insecure bool) (cl *Client) {
	var (
		httpcOpts = libhttp.ClientOptions{
			ServerURL:     serverURL,
			AllowInsecure: insecure,
		}
	)
	cl = &Client{
		Client: libhttp.NewClient(httpcOpts),
	}
	return cl
}

// Blockd return list of all block.d files on the server.
func (cl *Client) Blockd() (hostBlockd map[string]*Blockd, err error) {
	var (
		logp      = `Blockd`
		clientReq = libhttp.ClientRequest{
			Path: httpAPIBlockd,
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &hostBlockd,
	}

	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return hostBlockd, nil
}

// BlockdDisable disable specific hosts on block.d.
func (cl *Client) BlockdDisable(blockdName string) (blockd *Blockd, err error) {
	var (
		logp      = `BlockdDisable`
		clientReq = libhttp.ClientRequest{
			Path: httpAPIBlockdDisable,
			Params: url.Values{
				paramNameName: []string{blockdName},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &blockd,
	}

	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return blockd, nil
}

// BlockdEnable enable specific hosts on block.d.
func (cl *Client) BlockdEnable(blockdName string) (blockd *Blockd, err error) {
	var (
		logp      = `BlockdEnable`
		clientReq = libhttp.ClientRequest{
			Path: httpAPIBlockdEnable,
			Params: url.Values{
				paramNameName: []string{blockdName},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &blockd,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return blockd, nil
}

// BlockdFetch fetch the latest hosts file from the hosts block
// provider based on registered URL.
func (cl *Client) BlockdFetch(blockdName string) (blockd *Blockd, err error) {
	var (
		logp = `BlockdFetch`
		req  = libhttp.ClientRequest{
			Path: httpAPIBlockdFetch,
			Params: url.Values{
				paramNameName: []string{blockdName},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(req)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &blockd,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return blockd, nil
}

// Caches fetch all of non-local caches from server.
func (cl *Client) Caches() (answers []*dns.Answer, err error) {
	var (
		logp      = `Caches`
		clientReq = libhttp.ClientRequest{
			Path: httpAPICaches,
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &answers,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return answers, nil
}

// CachesRemove request to remove caches by its domain name.
func (cl *Client) CachesRemove(q string) (listAnswer []*dns.Answer, err error) {
	var (
		logp      = `CachesRemove`
		clientReq = libhttp.ClientRequest{
			Path: httpAPICaches,
			Params: url.Values{
				paramNameName: []string{q},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Delete(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &listAnswer,
	}

	err = json.Unmarshal(clientResp.Body, &res)
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
		logp      = `CachesSearch`
		clientReq = libhttp.ClientRequest{
			Path: httpAPICachesSearch,
			Params: url.Values{
				paramNameQuery: []string{q},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &listMsg,
	}
	err = json.Unmarshal(clientResp.Body, &res)
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
		logp      = `Env`
		clientReq = libhttp.ClientRequest{
			Path: httpAPIEnvironment,
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &env,
	}
	err = json.Unmarshal(clientResp.Body, &res)
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
		logp      = `EnvUpdate`
		clientReq = libhttp.ClientRequest{
			Path:   httpAPIEnvironment,
			Params: envIn,
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostJSON(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &envOut,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return envOut, nil
}

// HostsdCreate create new hosts file inside the hosts.d with requested name.
func (cl *Client) HostsdCreate(name string) (hostsFile *dns.HostsFile, err error) {
	var (
		logp      = `HostsdCreate`
		clientReq = libhttp.ClientRequest{
			Path: apiHostsd,
			Params: url.Values{
				paramNameName: []string{name},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &hostsFile,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return hostsFile, nil
}

// HostsdDelete delete hosts file inside the hosts.d by file name.
func (cl *Client) HostsdDelete(name string) (hostsFile *dns.HostsFile, err error) {
	var (
		logp      = `HostsdDelete`
		clientReq = libhttp.ClientRequest{
			Path: apiHostsd,
			Params: url.Values{
				paramNameName: []string{name},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Delete(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &hostsFile,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return hostsFile, nil
}

// HostsdGet get the content of hosts file inside the hosts.d by file name.
func (cl *Client) HostsdGet(name string) (listrr []*dns.ResourceRecord, err error) {
	var (
		logp      = `HostsdGet`
		clientReq = libhttp.ClientRequest{
			Path: apiHostsd,
			Params: url.Values{
				paramNameName: []string{name},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &listrr,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return listrr, nil
}

// HostsdRecordAdd add new resource record to the hosts file.
func (cl *Client) HostsdRecordAdd(hostsName, domain, value string) (record *dns.ResourceRecord, err error) {
	var (
		logp      = `HostsdRecordAdd`
		clientReq = libhttp.ClientRequest{
			Path: apiHostsdRR,
			Params: url.Values{
				paramNameName:   []string{hostsName},
				paramNameDomain: []string{domain},
				paramNameValue:  []string{value},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &record,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return record, nil
}

// HostsdRecordDelete delete a record from hosts file by domain name.
func (cl *Client) HostsdRecordDelete(hostsName, domain string) (record *dns.ResourceRecord, err error) {
	var (
		logp      = `HostsdRecordDelete`
		clientReq = libhttp.ClientRequest{
			Path: apiHostsdRR,
			Params: url.Values{
				paramNameName:   []string{hostsName},
				paramNameDomain: []string{domain},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Delete(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &record,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return record, nil
}

// Zoned fetch and return list of zone managed on server.
func (cl *Client) Zoned() (zones map[string]*dns.Zone, err error) {
	var (
		logp      = `Zoned`
		clientReq = libhttp.ClientRequest{
			Path: apiZoned,
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &zones,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	return zones, nil
}

// ZonedCreate create new zone file.
func (cl *Client) ZonedCreate(name string) (zone *dns.Zone, err error) {
	var (
		logp      = `ZonedCreate`
		clientReq = libhttp.ClientRequest{
			Path: apiZoned,
			Params: url.Values{
				paramNameName: []string{name},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.PostForm(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &zone,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return zone, nil
}

// ZonedDelete delete zone file by name.
func (cl *Client) ZonedDelete(name string) (zone *dns.Zone, err error) {
	var (
		logp      = `ZonedDelete`
		clientReq = libhttp.ClientRequest{
			Path: apiZoned,
			Params: url.Values{
				paramNameName: []string{name},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Delete(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if clientResp.HTTPResponse.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s: %s", logp, clientResp.HTTPResponse.Status)
	}

	var res = libhttp.EndpointResponse{
		Data: &zone,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}
	return zone, nil
}

// ZonedRecords fetch the zone records by its name.
func (cl *Client) ZonedRecords(zone string) (zoneRecords map[string][]*dns.ResourceRecord, err error) {
	var (
		logp      = `ZonedRecords`
		clientReq = libhttp.ClientRequest{
			Path: apiZonedRR,
			Params: url.Values{
				paramNameName: []string{zone},
			},
		}
		clientResp *libhttp.ClientResponse
	)

	clientResp, err = cl.Get(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = libhttp.EndpointResponse{
		Data: &zoneRecords,
	}
	err = json.Unmarshal(clientResp.Body, &res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	return zoneRecords, nil
}

// ZonedRecordAdd add new record to zone file.
func (cl *Client) ZonedRecordAdd(name string, rreq dns.ResourceRecord) (rres *dns.ResourceRecord, err error) {
	var (
		logp = `ZonedRecordAdd`
		zrr  = zoneRecordRequest{
			Name: name,
		}
		ok bool
	)

	zrr.Type, ok = dns.RecordTypeNames[rreq.Type]
	if !ok {
		return nil, fmt.Errorf("%s: unknown record type: %d", logp, rreq.Type)
	}

	var rawb []byte

	rawb, err = json.Marshal(rreq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	zrr.Record = base64.StdEncoding.EncodeToString(rawb)

	var clientReq = libhttp.ClientRequest{
		Path:   apiZonedRR,
		Params: zrr,
	}
	var clientResp *libhttp.ClientResponse

	clientResp, err = cl.PostJSON(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	rres = &dns.ResourceRecord{}
	var res = &libhttp.EndpointResponse{
		Data: rres,
	}
	err = json.Unmarshal(clientResp.Body, res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return rres, nil
}

// ZonedRecordDelete delete record from zone file.
func (cl *Client) ZonedRecordDelete(name string, rreq dns.ResourceRecord) (zoneRecords map[string][]*dns.ResourceRecord, err error) {
	var (
		logp   = `ZonedRecordDelete`
		params = url.Values{
			paramNameName: []string{name},
		}

		vstr string
		ok   bool
	)

	vstr, ok = dns.RecordTypeNames[rreq.Type]
	if !ok {
		return nil, fmt.Errorf("%s: unknown record type: %d", logp, rreq.Type)
	}
	params.Set(paramNameType, vstr)

	var rawb []byte

	rawb, err = json.Marshal(rreq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	vstr = base64.StdEncoding.EncodeToString(rawb)
	params.Set(paramNameRecord, vstr)

	var clientReq = libhttp.ClientRequest{
		Path:   apiZonedRR,
		Params: params,
	}
	var clientResp *libhttp.ClientResponse

	clientResp, err = cl.Delete(clientReq)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	var res = &libhttp.EndpointResponse{
		Data: &zoneRecords,
	}
	err = json.Unmarshal(clientResp.Body, res)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}
	if res.Code != http.StatusOK {
		return nil, fmt.Errorf("%s: %d %s", logp, res.Code, res.Message)
	}

	return zoneRecords, nil
}
