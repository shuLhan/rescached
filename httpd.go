// SPDX-FileCopyrightText: 2020 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/shuLhan/share/lib/dns"
	libhttp "github.com/shuLhan/share/lib/http"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defHTTPDRootDir = "_www"
	paramNameDomain = "domain"
	paramNameName   = "name"
	paramNameQuery  = "query"
	paramNameRecord = "record"
	paramNameType   = "type"
	paramNameValue  = "value"

	httpApiBlockd        = "/api/block.d"
	httpApiBlockdDisable = "/api/block.d/disable"
	httpApiBlockdEnable  = "/api/block.d/enable"
	httpApiBlockdFetch   = "/api/block.d/fetch"

	httpApiCaches       = "/api/caches"
	httpApiCachesSearch = "/api/caches/search"

	httpApiEnvironment = "/api/environment"

	apiHostsd   = "/api/hosts.d"
	apiHostsdRR = "/api/hosts.d/rr"

	apiZoned   = "/api/zone.d"
	apiZonedRR = "/api/zone.d/rr"
)

func (srv *Server) httpdInit() (err error) {
	srv.httpd, err = libhttp.NewServer(srv.env.HttpdOptions)
	if err != nil {
		return fmt.Errorf("newHTTPServer: %w", err)
	}

	err = srv.httpdRegisterEndpoints()
	if err != nil {
		return fmt.Errorf("newHTTPServer: %w", err)
	}

	return nil
}

func (srv *Server) httpdRegisterEndpoints() (err error) {
	// Register HTTP APIs to manage block.d.

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         httpApiBlockd,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdList,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPut,
		Path:         httpApiBlockd,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdUpdate,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         httpApiBlockdDisable,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdDisable,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         httpApiBlockdEnable,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdEnable,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         httpApiBlockdFetch,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdFetch,
	})
	if err != nil {
		return err
	}

	// Register HTTP APIs to manage caches.

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         httpApiCaches,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiCaches,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         httpApiCaches,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiCachesDelete,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         httpApiCachesSearch,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiCachesSearch,
	})
	if err != nil {
		return err
	}

	// Register HTTP APIs to manage environment.

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         httpApiEnvironment,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiEnvironmentGet,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         httpApiEnvironment,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiEnvironmentUpdate,
	})
	if err != nil {
		return err
	}

	// Register HTTP APIs to manage hosts.d.

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiHostsd,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsdCreate,
	})
	if err != nil {
		return err
	}
	// Register API to delete hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiHostsd,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsdDelete,
	})
	if err != nil {
		return err
	}
	// Register API to get content of hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiHostsd,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsdGet,
	})
	if err != nil {
		return err
	}

	// Register API to create one record in hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiHostsdRR,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsdRecordAdd,
	})
	if err != nil {
		return err
	}

	// Register API to delete a record from hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiHostsdRR,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsdRecordDelete,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiZoned,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZoned,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiZoned,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZonedCreate,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiZoned,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZonedDelete,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiZonedRR,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZonedRR,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiZonedRR,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZonedRRAdd,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiZonedRR,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZonedRRDelete,
	})
	if err != nil {
		return err
	}
	return nil
}

func (srv *Server) httpdRun() {
	defer func() {
		err := recover()
		if err != nil {
			log.Printf("httpServer: %s", err)
		}
	}()

	log.Printf("=== rescached: httpd listening at %s", srv.env.WUIListen)

	err := srv.httpd.Start()
	if err != nil {
		log.Printf("httpServer.run: %s", err)
	}
}

// httpApiBlockdList fetch the list of block.d files.
//
// # Request
//
//	GET /api/block.d
//
// # Response
//
// On success it will return list of hosts in block.d,
//
//	{
//		"data": {
//			"<name>": <Blockd>
//			...
//		}
//	}
func (srv *Server) httpApiBlockdList(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
	)

	res.Code = http.StatusOK
	res.Data = srv.env.HostBlockd

	resBody, err = json.Marshal(&res)
	return resBody, err
}

// httpApiBlockdDisable disable the hosts block.d.
//
// # Request
//
//	POST /api/block.d/disable
//	Content-Type: application/x-www-form-urlencoded
//
//	name=<name>
//
// # Response
//
// On success, it will return the affected Blockd object.
//
//	{
//		"data": <Blockd>
//	}
func (srv *Server) httpApiBlockdDisable(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}

		hb     *Blockd
		hbName string
	)

	hbName = strings.ToLower(epr.HttpRequest.Form.Get(paramNameName))

	hb = srv.env.HostBlockd[hbName]
	if hb == nil {
		res.Code = http.StatusBadRequest
		res.Message = fmt.Sprintf("hosts block.d name not found: %s", hbName)
		return nil, &res
	}

	if hb.IsEnabled {
		err = hb.disable()
		if err != nil {
			res.Code = http.StatusInternalServerError
			res.Message = err.Error()
			return nil, &res
		}
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("hosts block.d %s has succesfully disabled", hbName)
	res.Data = hb

	return json.Marshal(&res)
}

// httpApiBlockdEnable enable the hosts block.d.
//
// # Request
//
//	POST /api/block.d/enable
//	Content-Type: application/x-www-form-urlencoded
//
//	name=<name>
//
// # Response
//
// On success, it will return the affected Blockd object.
//
//	{
//		"data": <Blockd>
//	}
func (srv *Server) httpApiBlockdEnable(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}

		hb     *Blockd
		hbName string
	)

	hbName = strings.ToLower(epr.HttpRequest.Form.Get(paramNameName))

	hb = srv.env.HostBlockd[hbName]
	if hb == nil {
		res.Code = http.StatusBadRequest
		res.Message = fmt.Sprintf("hosts block.d name not found: %s", hbName)
		return nil, &res
	}

	if !hb.IsEnabled {
		err = hb.enable()
		if err != nil {
			res.Code = http.StatusInternalServerError
			res.Message = err.Error()
			return nil, &res
		}
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("hosts block.d %s has succesfully enabled", hbName)
	res.Data = hb

	return json.Marshal(&res)
}

// httpApiBlockdFetch fetch the latest hosts file from the block.d provider
// based on registered URL.
//
// # Request
//
//	POST /api/block.d/update
//	Content-Type: application/x-www-form-urlencoded
//
//	Name=<block.d name>
//
// # Response
//
// On success, the hosts file will be updated and the server will be
// restarted.
func (srv *Server) httpApiBlockdFetch(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		logp = "httpApiBlockdFetch"
		res  = libhttp.EndpointResponse{}

		hb     *Blockd
		hbName string
	)

	hbName = strings.ToLower(epr.HttpRequest.Form.Get(paramNameName))

	hb = srv.env.HostBlockd[hbName]
	if hb == nil {
		res.Code = http.StatusBadRequest
		res.Message = fmt.Sprintf("%s: unknown hosts block.d name: %s", logp, hbName)
		return nil, &res
	}

	err = hb.update()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = fmt.Sprintf("%s: %s", logp, err)
		return nil, &res
	}

	srv.Stop()
	err = srv.Start()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("%s: block.d %s has succesfully updated", logp, hbName)
	res.Data = hb

	return json.Marshal(&res)
}

func (srv *Server) httpApiCaches(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res     = libhttp.EndpointResponse{}
		answers = srv.dns.CachesLRU()
	)
	res.Code = http.StatusOK
	if len(answers) == 0 {
		res.Data = make([]struct{}, 0, 1)
	} else {
		res.Data = answers
	}
	return json.Marshal(&res)
}

func (srv *Server) httpApiCachesSearch(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
		q   = epr.HttpRequest.Form.Get(paramNameQuery)

		re      *regexp.Regexp
		listMsg []*dns.Message
	)

	if len(q) == 0 {
		res.Code = http.StatusOK
		res.Data = make([]struct{}, 0, 1)
		return json.Marshal(&res)
	}

	re, err = regexp.Compile(q)
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	listMsg = srv.dns.SearchCaches(re)
	if listMsg == nil {
		listMsg = make([]*dns.Message, 0)
	}

	res.Code = http.StatusOK
	res.Data = listMsg

	return json.Marshal(&res)
}

func (srv *Server) httpApiCachesDelete(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
		q   = epr.HttpRequest.Form.Get(paramNameName)

		answers []*dns.Answer
	)

	if len(q) == 0 {
		res.Code = http.StatusInternalServerError
		res.Message = "empty query 'name' parameter"
		return nil, &res
	}
	if q == "all" {
		answers = srv.dns.CachesClear()
	} else {
		answers = srv.dns.RemoveCachesByNames([]string{q})
	}

	res.Code = http.StatusOK
	res.Data = answers

	return json.Marshal(&res)
}

// httpApiEnvironmentGet get the current Environment.
//
// # Request
//
//	GET /api/environment
//
// # Response
//
//	Content-Type: application/json
//
//	{
//		"data": <Environment>
//	}
func (srv *Server) httpApiEnvironmentGet(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
	)

	res.Code = http.StatusOK
	res.Data = srv.env

	return json.Marshal(&res)
}

// httpApiEnvironmentUpdate update the environment and restart the service.
//
// # Request
//
//	POST /api/environment
//	Content-Type: application/json
//
//	{
//		<Environment>
//	}
//
// # Response
//
//	Content-Type: application/json
//
//	{
//		"data": <Environment>
//	}
func (srv *Server) httpApiEnvironmentUpdate(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		logp    = "httpApiEnvironmentUpdate"
		res     = libhttp.EndpointResponse{}
		newOpts = new(Environment)
	)

	err = json.Unmarshal(epr.RequestBody, newOpts)
	if err != nil {
		res.Code = http.StatusBadRequest
		res.Message = err.Error()
		return nil, &res
	}

	if len(newOpts.NameServers) == 0 {
		res.Code = http.StatusBadRequest
		res.Message = "at least one parent name servers must be defined"
		return nil, &res
	}

	err = newOpts.init()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = fmt.Sprintf("%s: %s", logp, err)
		return nil, &res
	}

	fmt.Printf("new options: %+v\n", newOpts)

	err = newOpts.write(srv.env.fileConfig)
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	srv.env = newOpts

	srv.Stop()
	err = srv.Start()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = "Restarting DNS server"
	res.Data = newOpts

	return json.Marshal(&res)
}

// httpApiBlockdUpdate set the HostsBlock to be enabled or disabled.
//
// If its status changes to enabled, unhide the hosts block file, populate the
// hosts back to caches, and add it to list of hostBlockdFile.
//
// If its status changes to disabled, remove the hosts from caches, hide it,
// and remove it from list of hostBlockdFile.
//
// # Request
func (srv *Server) httpApiBlockdUpdate(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		logp       = "httpApiBlockdUpdate"
		res        = libhttp.EndpointResponse{}
		hostBlockd = make(map[string]*Blockd, 0)

		hbx *Blockd
		hby *Blockd
	)

	err = json.Unmarshal(epr.RequestBody, &hostBlockd)
	if err != nil {
		res.Code = http.StatusBadRequest
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusInternalServerError

	for _, hbx = range hostBlockd {
		for _, hby = range srv.env.HostBlockd {
			if hbx.Name != hby.Name {
				continue
			}
			if hbx.IsEnabled == hby.IsEnabled {
				break
			}

			if hbx.IsEnabled {
				err = srv.blockdEnable(hby)
				if err != nil {
					res.Message = err.Error()
					return nil, &res
				}
			} else {
				err = srv.blockdDisable(hby)
				if err != nil {
					res.Message = err.Error()
					return nil, &res
				}
				hby.IsEnabled = false
			}
		}
	}

	err = srv.env.write(srv.env.fileConfig)
	if err != nil {
		log.Printf("%s: %s", logp, err.Error())
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Data = hostBlockd

	return json.Marshal(&res)
}

func (srv *Server) blockdEnable(hb *Blockd) (err error) {
	var (
		logp = "blockdEnable"

		hfile *dns.HostsFile
	)

	err = hb.enable()
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	err = hb.update()
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	hfile, err = dns.ParseHostsFile(hb.file)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	err = srv.dns.PopulateCachesByRR(hfile.Records, hfile.Path)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	srv.env.hostBlockdFile[hfile.Name] = hfile

	return nil
}

func (srv *Server) blockdDisable(hb *Blockd) (err error) {
	var (
		logp = "blockdDisable"

		hfile *dns.HostsFile
	)

	hfile = srv.env.hostBlockdFile[hb.Name]
	if hfile == nil {
		return fmt.Errorf("%s: unknown hosts block: %q", logp, hb.Name)
	}

	srv.dns.RemoveLocalCachesByNames(hfile.Names())

	err = hb.disable()
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	delete(srv.env.hostBlockdFile, hfile.Name)

	return nil
}

// apiHostsdCreate create new hosts file inside the hosts.d directory with the
// name from request parameter.
//
// # Request
//
//	POST /api/hosts.d
//	Content-Type: application/x-www-form-urlencoded
//
//	name=<hosts file name>
//
// # Response
//
// On success it will return the HostsFile object in JSON format.
//
//	Content-Type: application/json
//
//	{
//		"code": 200,
//		"data": <HostsFile>
//	}
//
// This API is idempotent, which means, calling this API several times with
// same name will return the same HostsFile object.
func (srv *Server) apiHostsdCreate(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res  = libhttp.EndpointResponse{}
		name = epr.HttpRequest.Form.Get(paramNameName)

		hfile *dns.HostsFile
		path  string
	)

	if len(name) == 0 {
		res.Code = http.StatusBadRequest
		res.Message = "parameter hosts file name is empty"
		return nil, &res
	}

	hfile = srv.env.HostsFiles[name]
	if hfile == nil {
		path = filepath.Join(srv.env.pathDirHosts, name)
		hfile, err = dns.NewHostsFile(path, nil)
		if err != nil {
			res.Code = http.StatusInternalServerError
			res.Message = err.Error()
			return nil, &res
		}
		srv.env.HostsFiles[hfile.Name] = hfile
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("Hosts file %q has been created", name)
	res.Data = hfile

	return json.Marshal(&res)
}

// apiHostsdDelete delete a hosts file by name in hosts.d directory.
//
// # Request
//
//	DELETE /api/hosts.d?name=<name>
//
// # Response
//
// On success, if the hosts file name exists, the local caches associated with
// hosts file will be removed and the hosts file will be deleted.
// Server will return the deleted HostsFile object in JSON format,
//
//	Content-Type: application/json
//
//	{
//		"code": 200,
//		"data": <HostsFile>
//	}
//
// On fail server will return 4xx or 5xx HTTP status code.
func (srv *Server) apiHostsdDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res  = libhttp.EndpointResponse{}
		name = epr.HttpRequest.Form.Get(paramNameName)

		hfile *dns.HostsFile
		found bool
	)

	if len(name) == 0 {
		res.Code = http.StatusBadRequest
		res.Message = "empty or invalid parameter for host file name"
		return nil, &res
	}

	hfile, found = srv.env.HostsFiles[name]
	if !found {
		res.Code = http.StatusBadRequest
		res.Message = fmt.Sprintf("hosts file %s not found", name)
		return nil, &res
	}

	// Remove the records associated with hosts file.
	srv.dns.RemoveLocalCachesByNames(hfile.Names())

	err = hfile.Delete()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	delete(srv.env.HostsFiles, name)

	res.Code = http.StatusOK
	res.Message = name + " has been deleted"
	res.Data = hfile

	return json.Marshal(&res)
}

// apiHostsdGet get the content of hosts file inside hosts.d by its file name.
//
// # Request
//
//	GET /api/hosts.d?name=<name>
//
// # Response
//
// On success, it will return list of resource record in JSON format.
func (srv *Server) apiHostsdGet(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res  = libhttp.EndpointResponse{}
		name = epr.HttpRequest.Form.Get(paramNameName)

		hf    *dns.HostsFile
		found bool
	)

	hf, found = srv.env.HostsFiles[name]
	if !found {
		res.Code = http.StatusNotFound
		res.Message = "invalid or empty hosts file " + name
		return nil, &res
	}
	if hf.Records == nil || cap(hf.Records) == 0 {
		hf.Records = make([]*dns.ResourceRecord, 0, 1)
	}

	res.Code = http.StatusOK
	res.Data = hf.Records

	return json.Marshal(&res)
}

// apiHostsdRecordAdd add new record and save it to the hosts file.
//
// # Request
//
// Request format,
//
//	POST /api/hosts.d/rr
//	content-type: application/x-www-form-urlencoded
//
//	name=&domain=&value=
//
// Parameters,
//
//   - name: the hosts file name where record to be added.
//   - domain: the domain name.
//   - value: the IPv4 or IPv6 address of domain name.
//
// If the domain name already exist, the new record will be appended to the
// end of file.
//
// # Response
//
// On success, a single line "<domain> <value>" will be appended to the hosts
// file as new record and return it to the caller.
func (srv *Server) apiHostsdRecordAdd(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res           = libhttp.EndpointResponse{}
		hostsFileName = epr.HttpRequest.Form.Get(paramNameName)

		hfile *dns.HostsFile
		rr    *dns.ResourceRecord
		v     string
		found bool
	)

	res.Code = http.StatusBadRequest

	if len(hostsFileName) == 0 {
		res.Message = "empty hosts file name in request path"
		return nil, &res
	}

	hfile, found = srv.env.HostsFiles[hostsFileName]
	if !found {
		res.Message = "unknown hosts file name: " + hostsFileName
		return nil, &res
	}

	rr = &dns.ResourceRecord{
		Class: dns.RecordClassIN,
	}

	rr.Name = epr.HttpRequest.Form.Get(paramNameDomain)
	if len(rr.Name) == 0 {
		res.Message = "empty 'domain' query parameter"
		return nil, &res
	}
	v = epr.HttpRequest.Form.Get(paramNameValue)
	if len(v) == 0 {
		res.Message = "empty 'value' query parameter"
		return nil, &res
	}
	rr.Type = dns.RecordTypeFromAddress([]byte(v))
	if rr.Type == 0 {
		res.Message = "invalid address value: " + v
		return nil, &res
	}
	rr.Value = v

	err = hfile.AppendAndSaveRecord(rr)
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	err = srv.dns.PopulateCachesByRR([]*dns.ResourceRecord{rr}, hostsFileName)
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Data = rr

	return json.Marshal(&res)
}

// apiHostsdRecordDelete delete a record from hosts file by domain name.
//
// # Request
//
//	DELETE /api/hosts.d/record?name=&domain=
//
// # Response
//
// If the hosts file "name" exist and domain name exist, it will return HTTP
// status code 200.
func (srv *Server) apiHostsdRecordDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res           = libhttp.EndpointResponse{}
		hostsFileName = epr.HttpRequest.Form.Get(paramNameName)
		domainName    = epr.HttpRequest.Form.Get(paramNameDomain)

		hfile *dns.HostsFile
		rr    *dns.ResourceRecord
		found bool
	)

	res.Code = http.StatusBadRequest

	if len(hostsFileName) == 0 {
		res.Message = "empty hosts file name in request path"
		return nil, &res
	}
	if len(domainName) == 0 {
		res.Message = "empty 'domain' query parameter"
		return nil, &res
	}

	hfile, found = srv.env.HostsFiles[hostsFileName]
	if !found {
		res.Message = "unknown hosts file name: " + hostsFileName
		return nil, &res
	}

	rr = hfile.RemoveRecord(domainName)
	if rr == nil {
		res.Message = "unknown domain name: " + domainName
		return nil, &res
	}
	err = hfile.Save()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	srv.dns.RemoveLocalCachesByNames([]string{domainName})

	res.Code = http.StatusOK
	res.Message = "domain name '" + domainName + "' has been removed from hosts file"
	res.Data = rr

	return json.Marshal(&res)
}

// apiZoned return all zone files in JSON format.
//
// # Request
//
//	GET /api/zone.d
//
// # Response
//
// On success, it will return HTTP status code 200 with all zone formatted as
// JSON in the body,
//
//	Content-Type: application/json
//
//	{
//		"code": 200,
//		"data": {
//			"<zone name>: <dns.Zone>,
//			...
//		}
//	}
func (srv *Server) apiZoned(epr *libhttp.EndpointRequest) (resb []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
	)

	res.Code = http.StatusOK
	res.Data = srv.env.Zones
	resb, err = json.Marshal(&res)
	return resb, err
}

func (srv *Server) apiZonedCreate(epr *libhttp.EndpointRequest) (resb []byte, err error) {
	var (
		res      = libhttp.EndpointResponse{}
		zoneName = epr.HttpRequest.Form.Get(paramNameName)

		zone     *dns.Zone
		zoneFile string
	)

	res.Code = http.StatusBadRequest

	if len(zoneName) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, &res
	}

	if !libnet.IsHostnameValid([]byte(zoneName), true) {
		res.Message = "zone file name must be valid hostname"
		return nil, &res
	}

	zone = srv.env.Zones[zoneName]
	if zone != nil {
		res.Code = http.StatusOK
		res.Data = zone
		return json.Marshal(&res)
	}

	zoneFile = filepath.Join(srv.env.pathDirZone, zoneName)
	zone = dns.NewZone(zoneFile, zoneName)
	err = zone.Save()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	srv.env.Zones[zoneName] = zone

	res.Code = http.StatusOK
	res.Data = zone

	resb, err = json.Marshal(&res)
	return resb, err
}

func (srv *Server) apiZonedDelete(epr *libhttp.EndpointRequest) (resb []byte, err error) {
	var (
		res      = libhttp.EndpointResponse{}
		zoneName = epr.HttpRequest.Form.Get(paramNameName)

		zone  *dns.Zone
		names []string
		name  string
	)

	res.Code = http.StatusBadRequest

	if len(zoneName) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, &res
	}

	zone = srv.env.Zones[zoneName]
	if zone == nil {
		res.Message = "zone file not found: " + zoneName
		return nil, &res
	}

	names = make([]string, 0, len(zone.Records))
	for name = range zone.Records {
		names = append(names, name)
	}

	srv.dns.RemoveLocalCachesByNames(names)
	delete(srv.env.Zones, zoneName)

	err = zone.Delete()
	if err != nil {
		res.Code = http.StatusInternalServerError
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = zoneName + " has been deleted"
	res.Data = zone

	return json.Marshal(&res)
}

// apiZonedRR fetch all records on specific zone by its name.
//
// # Request
//
//	GET /api/zone.d/rr?name=<string>
//
// Parameters,
//   - name: the zone file name where records to be fetched.
//
// # Response
//
// If the zone file exist, it will return HTTP status code 200 with response
// body contains mapping of domain name and records.
//
//	{
//		"code": 200,
//		"data": {
//			"<domain>": [dns.ResourceRecord],
//			...
//		}
//	}
func (srv *Server) apiZonedRR(epr *libhttp.EndpointRequest) (resb []byte, err error) {
	var (
		zoneName = epr.HttpRequest.Form.Get(paramNameName)
		res      = libhttp.EndpointResponse{}

		zone *dns.Zone
	)

	res.Code = http.StatusBadRequest

	if len(zoneName) == 0 {
		res.Message = fmt.Sprintf("unknown or empty zone parameter: %q", zoneName)
		return nil, &res
	}

	zone = srv.env.Zones[zoneName]
	if zone == nil {
		res.Message = fmt.Sprintf("unknown or empty zone parameter: %q", zoneName)
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Data = zone.Records

	resb, err = json.Marshal(&res)
	return resb, err
}

// apiZonedRRAdd create new RR for the zone file.
//
// # Request
//
//	POST /api/zone.d/rr
//	Content-Type: application/json
//
//	{
//		"zone": <string>,
//		"type": <string>,
//		"record": <base64 string|base64 JSON>
//	}
//
// For example, to add A record for subdomain "www" to zone file "my.zone",
// the request format would be,
//
//	{
//		"zone": "my.zone",
//		"type": "A",
//		"record": "eyJOYW1lIjoid3d3IiwiVmFsdWUiOiIxMjcuMC4wLjEifQ=="
//	}
//
// Where "record" value is equal to `{"Name":"www","Value":"127.0.0.1"}`.
//
// # Response
//
// On success, it will return the record being added to the zone file, in the
// JSON format.
func (srv *Server) apiZonedRRAdd(epr *libhttp.EndpointRequest) (resb []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
		req = zoneRecordRequest{}

		zoneFile *dns.Zone
		rr       *dns.ResourceRecord
		listRR   []*dns.ResourceRecord
		rrValue  string
		ok       bool
	)

	res.Code = http.StatusBadRequest

	err = json.Unmarshal(epr.RequestBody, &req)
	if err != nil {
		res.Message = fmt.Sprintf("invalid request: %s", err.Error())
		return nil, &res
	}

	if len(req.Name) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, &res
	}

	zoneFile = srv.env.Zones[req.Name]
	if zoneFile == nil {
		res.Message = "unknown zone file name: " + req.Name
		return nil, &res
	}

	req.Type = strings.ToUpper(req.Type)
	req.rtype, ok = dns.RecordTypes[req.Type]
	if !ok {
		res.Message = fmt.Sprintf("invalid or empty RR type %q: %s", req.Type, err.Error())
		return nil, &res
	}

	req.recordRaw, err = base64.StdEncoding.DecodeString(req.Record)
	if err != nil {
		res.Message = fmt.Sprintf("invalid record value: %s", err.Error())
		return nil, &res
	}

	rr = &dns.ResourceRecord{}
	switch req.rtype {
	case dns.RecordTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.RecordTypeMX:
		rr.Value = &dns.RDataMX{}
	default:
		rr.Value = rrValue
	}

	err = json.Unmarshal(req.recordRaw, rr)
	if err != nil {
		res.Message = "json.Unmarshal:" + err.Error()
		return nil, &res
	}

	rr.Name = strings.TrimRight(rr.Name, ".")

	if rr.Type == dns.RecordTypePTR {
		if len(rr.Name) == 0 {
			res.Message = "empty PTR name"
			return nil, &res
		}
		if len(rrValue) == 0 {
			rr.Value = req.Name
		} else {
			rr.Value = rrValue + "." + req.Name
		}
	} else {
		if len(rr.Name) == 0 {
			rr.Name = req.Name
		} else {
			rr.Name += "." + req.Name
		}
	}

	listRR = []*dns.ResourceRecord{rr}
	err = srv.dns.PopulateCachesByRR(listRR, zoneFile.Path)
	if err != nil {
		res.Code = http.StatusBadRequest
		res.Message = "PopulateCacheByRR: " + err.Error()
		return nil, &res
	}

	// Update the Zone file.
	err = zoneFile.Add(rr)
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}

	err = zoneFile.Save()
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("%s record has been saved", dns.RecordTypeNames[rr.Type])
	res.Data = rr

	return json.Marshal(&res)
}

// apiZonedRRDelete delete RR from the zone file.
//
// # Request
//
//	DELETE /api/zone.d/rr?name=<string>&type=<string>&record=<base64 json>
//
// Parameters,
//
//   - name: the zone name,
//   - type: the record type,
//   - record: the content of record with its domain name and value.
//
// # Response
//
// On success it will return all the records in the zone.
//
// On fail it will return,
//   - 400: if one of the parameter is invalid or empty.
//   - 404: if the record to be deleted not found.
func (srv *Server) apiZonedRRDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
		req = zoneRecordRequest{}
		rr  = &dns.ResourceRecord{}

		zone    *dns.Zone
		rrValue string
		ok      bool
	)

	res.Code = http.StatusBadRequest

	req.Name = epr.HttpRequest.Form.Get(paramNameName)
	if len(req.Name) == 0 {
		res.Message = "empty zone file name"
		return nil, &res
	}

	zone = srv.env.Zones[req.Name]
	if zone == nil {
		res.Message = "unknown zone file name " + req.Name
		return nil, &res
	}

	req.Type = epr.HttpRequest.Form.Get(paramNameType)
	req.rtype, ok = dns.RecordTypes[req.Type]
	if !ok {
		res.Message = fmt.Sprintf("invalid or empty param type %s: %s", paramNameType, err)
		return nil, &res
	}

	req.Record = epr.HttpRequest.Form.Get(paramNameRecord)
	req.recordRaw, err = base64.StdEncoding.DecodeString(req.Record)
	if err != nil {
		res.Message = fmt.Sprintf("invalid record value: %s", err.Error())
		return nil, &res
	}

	switch req.rtype {
	case dns.RecordTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.RecordTypeMX:
		rr.Value = &dns.RDataMX{}
	default:
		rr.Value = rrValue
	}
	err = json.Unmarshal(req.recordRaw, rr)
	if err != nil {
		res.Message = "json.Unmarshal: " + err.Error()
		return nil, &res
	}

	rr.Name = strings.TrimRight(rr.Name, ".")

	if rr.Type == dns.RecordTypePTR {
		if len(rr.Name) == 0 {
			res.Message = "empty PTR name"
			return nil, &res
		}
		if len(rrValue) == 0 {
			rr.Value = req.Name
		} else {
			rr.Value = rrValue + "." + req.Name
		}
	} else {
		if len(rr.Name) == 0 {
			rr.Name = req.Name
		} else {
			rr.Name += "." + req.Name
		}
	}

	// Remove the RR from caches.
	rr, err = srv.dns.RemoveCachesByRR(rr)
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}
	if rr == nil {
		res.Code = http.StatusNotFound
		res.Message = "record not found"
		return nil, &res
	}

	// Remove the RR from zone file.
	err = zone.Remove(rr)
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("The RR type %d and name %s has been deleted", rr.Type, rr.Name)
	res.Data = zone.Records

	return json.Marshal(&res)
}
