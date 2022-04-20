// SPDX-FileCopyrightText: 2020 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
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
	paramNameType   = "type"
	paramNameValue  = "value"

	apiBlockd        = "/api/block.d"
	apiBlockdDisable = "/api/block.d/disable"
	apiBlockdEnable  = "/api/block.d/enable"
	apiBlockdUpdate  = "/api/block.d/update"

	apiCaches       = "/api/caches"
	apiCachesSearch = "/api/caches/search"

	apiEnvironment = "/api/environment"

	apiHostsDir   = "/api/hosts.d/:name"
	apiHostsDirRR = "/api/hosts.d/:name/rr"

	apiZone       = "/api/zone.d/:name"
	apiZoneRRType = "/api/zone.d/:name/rr/:type"
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
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiCaches,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiCaches,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiCachesSearch,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiCachesSearch,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiCaches,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpdAPICachesDelete,
	})
	if err != nil {
		return err
	}

	epAPIGetEnvironment := &libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiEnvironment,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpdAPIGetEnvironment,
	}

	err = srv.httpd.RegisterEndpoint(epAPIGetEnvironment)
	if err != nil {
		return err
	}

	apiEnvironmentUpdate := &libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiEnvironment,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiEnvironmentUpdate,
	}

	err = srv.httpd.RegisterEndpoint(apiEnvironmentUpdate)
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiBlockd,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsBlockUpdate,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiBlockdDisable,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdDisable,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiBlockdEnable,
		RequestType:  libhttp.RequestTypeForm,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdEnable,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiBlockdUpdate,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.httpApiBlockdUpdate,
	})
	if err != nil {
		return err
	}

	// Register API to create new hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPut,
		Path:         apiHostsDir,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsFileCreate,
	})
	if err != nil {
		return err
	}
	// Register API to get content of hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodGet,
		Path:         apiHostsDir,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsFileGet,
	})
	if err != nil {
		return err
	}
	// Register API to delete hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiHostsDir,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsFileDelete,
	})
	if err != nil {
		return err
	}

	// Register API to create one record in hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiHostsDirRR,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsFileRRCreate,
	})
	if err != nil {
		return err
	}

	// Register API to delete a record from hosts file.
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiHostsDirRR,
		RequestType:  libhttp.RequestTypeQuery,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiHostsFileRRDelete,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPut,
		Path:         apiZone,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZoneCreate,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiZone,
		RequestType:  libhttp.RequestTypeNone,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZoneDelete,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodPost,
		Path:         apiZoneRRType,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZoneRRCreate,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&libhttp.Endpoint{
		Method:       libhttp.RequestMethodDelete,
		Path:         apiZoneRRType,
		RequestType:  libhttp.RequestTypeJSON,
		ResponseType: libhttp.ResponseTypeJSON,
		Call:         srv.apiZoneRRDelete,
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

// httpApiBlockdDisable disable the hosts block.d.
func (srv *Server) httpApiBlockdDisable(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}

		hb     *hostsBlock
		hbName string
	)

	hbName = strings.ToLower(epr.HttpRequest.Form.Get(paramNameName))

	hb = srv.env.HostsBlocks[hbName]
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
func (srv *Server) httpApiBlockdEnable(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}

		hb     *hostsBlock
		hbName string
	)

	hbName = strings.ToLower(epr.HttpRequest.Form.Get(paramNameName))

	hb = srv.env.HostsBlocks[hbName]
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

// httpApiBlockdUpdate fetch the latest hosts file from the hosts block
// provider based on registered URL.
//
// # Request
//
//	POST /api/block.d/update
//	Content-Type: application/json
//
//	{
//		"Name": <block.d name>
//	}
//
// # Response
//
// On success, the hosts file will be updated and the server will be
// restarted.
func (srv *Server) httpApiBlockdUpdate(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		logp = "httpApiBlockdUpdate"
		res  = libhttp.EndpointResponse{}

		hb     *hostsBlock
		hbName string
	)

	err = json.Unmarshal(epr.RequestBody, &hb)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", logp, err)
	}

	hbName = strings.ToLower(hb.Name)

	hb = srv.env.HostsBlocks[hbName]
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

func (srv *Server) apiCaches(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
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

func (srv *Server) apiCachesSearch(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
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

func (srv *Server) httpdAPICachesDelete(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
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

func (srv *Server) httpdAPIGetEnvironment(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res = libhttp.EndpointResponse{}
	)

	res.Code = http.StatusOK
	res.Data = srv.env

	return json.Marshal(&res)
}

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

// apiHostsBlockUpdate set the HostsBlock to be enabled or disabled.
//
// If its status changes to enabled, unhide the hosts block file, populate the
// hosts back to caches, and add it to list of hostsBlocksFile.
//
// If its status changes to disabled, remove the hosts from caches, hide it,
// and remove it from list of hostsBlocksFile.
func (srv *Server) apiHostsBlockUpdate(epr *libhttp.EndpointRequest) (resBody []byte, err error) {
	var (
		res         = libhttp.EndpointResponse{}
		hostsBlocks = make(map[string]*hostsBlock, 0)

		hbx *hostsBlock
		hby *hostsBlock
	)

	err = json.Unmarshal(epr.RequestBody, &hostsBlocks)
	if err != nil {
		res.Code = http.StatusBadRequest
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusInternalServerError

	for _, hbx = range hostsBlocks {
		for _, hby = range srv.env.HostsBlocks {
			if hbx.Name != hby.Name {
				continue
			}
			if hbx.IsEnabled == hby.IsEnabled {
				break
			}

			if hbx.IsEnabled {
				err = srv.hostsBlockEnable(hby)
				if err != nil {
					res.Message = err.Error()
					return nil, &res
				}
			} else {
				err = srv.hostsBlockDisable(hby)
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
		log.Println("apiHostsBlockUpdate:", err.Error())
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Data = hostsBlocks

	return json.Marshal(&res)
}

func (srv *Server) hostsBlockEnable(hb *hostsBlock) (err error) {
	var (
		logp = "hostsBlockEnable"

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

	srv.env.hostsBlocksFile[hfile.Name] = hfile

	return nil
}

func (srv *Server) hostsBlockDisable(hb *hostsBlock) (err error) {
	var (
		logp = "hostsBlockDisable"

		hfile *dns.HostsFile
	)

	hfile = srv.env.hostsBlocksFile[hb.Name]
	if hfile == nil {
		return fmt.Errorf("%s: unknown hosts block: %q", logp, hb.Name)
	}

	srv.dns.RemoveLocalCachesByNames(hfile.Names())

	err = hb.disable()
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	delete(srv.env.hostsBlocksFile, hfile.Name)

	return nil
}

func (srv *Server) apiHostsFileCreate(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res  = libhttp.EndpointResponse{}
		name = epr.HttpRequest.Form.Get(paramNameName)

		hfile *dns.HostsFile
		path  string
		found bool
	)

	if len(name) == 0 {
		res.Code = http.StatusBadRequest
		res.Message = "parameter hosts file name is empty"
		return nil, &res
	}

	_, found = srv.env.HostsFiles[name]
	if !found {
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

	return json.Marshal(&res)
}

func (srv *Server) apiHostsFileGet(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
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

func (srv *Server) apiHostsFileDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
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
		res.Message = "apiDeleteHostsFile: " + name + " not found"
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
	return json.Marshal(&res)
}

// apiHostsFileRRCreate create new record and save it to the hosts file.
func (srv *Server) apiHostsFileRRCreate(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
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

func (srv *Server) apiHostsFileRRDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res           = libhttp.EndpointResponse{}
		hostsFileName = epr.HttpRequest.Form.Get(paramNameName)
		domainName    = epr.HttpRequest.Form.Get(paramNameDomain)

		hfile *dns.HostsFile
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

	found = hfile.RemoveRecord(domainName)
	if !found {
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

	return json.Marshal(&res)
}

func (srv *Server) apiZoneCreate(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
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

	return json.Marshal(&res)
}

func (srv *Server) apiZoneDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
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

	return json.Marshal(&res)
}

// apiZoneRRCreate create new RR for the zone file.
func (srv *Server) apiZoneRRCreate(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res          = libhttp.EndpointResponse{}
		zoneFileName = epr.HttpRequest.Form.Get(paramNameName)
		rrTypeValue  = epr.HttpRequest.Form.Get(paramNameType)

		zoneFile *dns.Zone
		rr       *dns.ResourceRecord
		v        string
		listRR   []*dns.ResourceRecord
		rrType   int
	)

	res.Code = http.StatusBadRequest

	if len(zoneFileName) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, &res
	}

	zoneFile = srv.env.Zones[zoneFileName]
	if zoneFile == nil {
		res.Message = "unknown zone file name " + zoneFileName
		return nil, &res
	}

	rrType, err = strconv.Atoi(rrTypeValue)
	if err != nil {
		res.Message = fmt.Sprintf("invalid or empty RR type %q: %s",
			rrTypeValue, err.Error())
		return nil, &res
	}

	rr = &dns.ResourceRecord{}
	switch dns.RecordType(rrType) {
	case dns.RecordTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.RecordTypeMX:
		rr.Value = &dns.RDataMX{}
	}
	err = json.Unmarshal(epr.RequestBody, rr)
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
		v = rr.Value.(string)
		if len(v) == 0 {
			rr.Value = zoneFileName
		} else {
			rr.Value = v + "." + zoneFileName
		}
	} else {
		if len(rr.Name) == 0 {
			rr.Name = zoneFileName
		} else {
			rr.Name += "." + zoneFileName
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
	if rr.Type == dns.RecordTypeSOA {
		res.Data = rr
	} else {
		res.Data = zoneFile.Records
	}

	return json.Marshal(&res)
}

// apiZoneRRDelete delete RR from the zone file.
func (srv *Server) apiZoneRRDelete(epr *libhttp.EndpointRequest) (resbody []byte, err error) {
	var (
		res          = libhttp.EndpointResponse{}
		zoneFileName = epr.HttpRequest.Form.Get(paramNameName)
		paramType    = epr.HttpRequest.Form.Get(paramNameType)
		rr           = dns.ResourceRecord{}

		zone   *dns.Zone
		rrType int
	)

	res.Code = http.StatusBadRequest

	if len(zoneFileName) == 0 {
		res.Message = "empty zone file name"
		return nil, &res
	}

	zone = srv.env.Zones[zoneFileName]
	if zone == nil {
		res.Message = "unknown zone file name " + zoneFileName
		return nil, &res
	}

	rrType, err = strconv.Atoi(paramType)
	if err != nil {
		res.Message = fmt.Sprintf("invalid or empty param type %s: %s",
			paramNameType, err)
		return nil, &res
	}

	switch dns.RecordType(rrType) {
	case dns.RecordTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.RecordTypeMX:
		rr.Value = &dns.RDataMX{}
	}
	err = json.Unmarshal(epr.RequestBody, &rr)
	if err != nil {
		res.Message = "json.Unmarshal:" + err.Error()
		return nil, &res
	}

	if len(rr.Name) == 0 {
		res.Message = "invalid or empty ResourceRecord.Name"
		return nil, &res
	}

	// Remove the RR from caches.
	err = srv.dns.RemoveCachesByRR(&rr)
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}

	// Remove the RR from zone file.
	err = zone.Remove(&rr)
	if err != nil {
		res.Message = err.Error()
		return nil, &res
	}

	res.Code = http.StatusOK
	res.Message = fmt.Sprintf("The RR type %d and name %s has been deleted", rr.Type, rr.Name)
	res.Data = zone.Records

	return json.Marshal(&res)
}
