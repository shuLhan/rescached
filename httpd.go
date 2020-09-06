// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	stdhttp "net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/shuLhan/share/lib/dns"
	liberrors "github.com/shuLhan/share/lib/errors"
	"github.com/shuLhan/share/lib/http"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defHTTPDRootDir     = "_public/"
	paramNameDomain     = "domain"
	paramNameName       = "name"
	paramNameQuery      = "query"
	paramNameType       = "type"
	paramNameValue      = "value"
	apiCaches           = "/api/caches"
	apiEnvironment      = "/api/environment"
	apiHostsBlock       = "/api/hosts_block"
	apiHostsDir         = "/api/hosts.d/:name"
	apiHostsDirRR       = "/api/hosts.d/:name/rr"
	apiMasterFile       = "/api/master.d/:name"
	apiMasterFileRRType = "/api/master.d/:name/rr/:type"
)

func (srv *Server) httpdInit() (err error) {
	env := &http.ServerOptions{
		Root:    defHTTPDRootDir,
		Address: srv.env.WUIListen,
		Includes: []string{
			`.*\.css`,
			`.*\.html`,
			`.*\.js`,
			`.*\.png`,
		},
		CORSAllowOrigins: []string{
			"http://127.0.0.1:5000",
		},
		CORSAllowHeaders: []string{
			http.HeaderContentType,
		},
		Development: srv.env.Debug >= 3,
	}

	srv.httpd, err = http.NewServer(env)
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
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodGet,
		Path:         apiCaches,
		RequestType:  http.RequestTypeQuery,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.httpdAPIGetCaches,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         apiCaches,
		RequestType:  http.RequestTypeQuery,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.httpdAPIDeleteCaches,
	})
	if err != nil {
		return err
	}

	epAPIGetEnvironment := &http.Endpoint{
		Method:       http.RequestMethodGet,
		Path:         apiEnvironment,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.httpdAPIGetEnvironment,
	}

	err = srv.httpd.RegisterEndpoint(epAPIGetEnvironment)
	if err != nil {
		return err
	}

	epAPIPostEnvironment := &http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         apiEnvironment,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.httpdAPIPostEnvironment,
	}

	err = srv.httpd.RegisterEndpoint(epAPIPostEnvironment)
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         apiHostsBlock,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsBlockUpdate,
	})
	if err != nil {
		return err
	}

	// Register API to create new hosts file.
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPut,
		Path:         apiHostsDir,
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeNone,
		Call:         srv.apiHostsFileCreate,
	})
	if err != nil {
		return err
	}
	// Register API to get content of hosts file.
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodGet,
		Path:         apiHostsDir,
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileGet,
	})
	if err != nil {
		return err
	}
	// Register API to delete hosts file.
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         apiHostsDir,
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileDelete,
	})
	if err != nil {
		return err
	}

	// Register API to create one record in hosts file.
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         apiHostsDirRR,
		RequestType:  http.RequestTypeQuery,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileRRCreate,
	})
	if err != nil {
		return err
	}
	// Register API to delete a record from hosts file.
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         apiHostsDirRR,
		RequestType:  http.RequestTypeQuery,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileRRDelete,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPut,
		Path:         apiMasterFile,
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiMasterFileCreate,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         apiMasterFile,
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiMasterFileDelete,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         apiMasterFileRRType,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiMasterFileCreateRR,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         apiMasterFileRRType,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiMasterFileDeleteRR,
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

func (srv *Server) httpdAPIGetCaches(
	_ stdhttp.ResponseWriter, req *stdhttp.Request, _ []byte,
) (
	resBody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusInternalServerError,
	}

	q := req.Form.Get(paramNameQuery)

	re, err := regexp.Compile(q)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	listMsg := srv.dns.SearchCaches(re)
	if listMsg == nil {
		listMsg = make([]*dns.Message, 0)
	}

	return json.Marshal(listMsg)
}

func (srv *Server) httpdAPIDeleteCaches(
	_ stdhttp.ResponseWriter, req *stdhttp.Request, _ []byte,
) (
	resBody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusInternalServerError,
	}

	q := req.Form.Get(paramNameName)
	if len(q) == 0 {
		res.Message = "empty query 'name' parameter"
		return nil, res
	}

	srv.dns.RemoveCachesByNames([]string{q})

	res.Code = stdhttp.StatusOK
	res.Message = fmt.Sprintf("%q has been removed from caches", q)

	return json.Marshal(res)
}

func (srv *Server) httpdAPIGetEnvironment(
	httpRes stdhttp.ResponseWriter, req *stdhttp.Request, reqBody []byte,
) (
	resBody []byte, err error,
) {
	return json.Marshal(srv.env)
}

func (srv *Server) httpdAPIPostEnvironment(
	httpRes stdhttp.ResponseWriter, req *stdhttp.Request, reqBody []byte,
) (
	resBody []byte, err error,
) {
	res := &liberrors.E{
		Code:    stdhttp.StatusOK,
		Message: "Restarting DNS server",
	}

	newOpts := new(environment)
	err = json.Unmarshal(reqBody, newOpts)
	if err != nil {
		return nil, err
	}

	if len(newOpts.NameServers) == 0 {
		res.Code = stdhttp.StatusBadRequest
		res.Message = "at least one parent name servers must be defined"
		return nil, res
	}

	newOpts.init()

	fmt.Printf("new options: %+v\n", newOpts)

	err = newOpts.write(srv.fileConfig)
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	srv.env = newOpts

	srv.Stop()
	err = srv.Start()
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	return json.Marshal(res)
}

//
// apiHostsBlockUpdate set the HostsBlock to be enabled or disabled.
//
// If its status changes to enabled, unhide it file, populate the hosts back
// to caches, and add it to list of HostsFiles.
//
// If its status changes to disabled, remove the hosts from caches, hide it,
// and remove it from list of HostsFiles.
//
func (srv *Server) apiHostsBlockUpdate(
	httpRes stdhttp.ResponseWriter, req *stdhttp.Request, reqBody []byte,
) (
	resBody []byte, err error,
) {
	hostsBlocks := make([]*hostsBlock, 0)

	err = json.Unmarshal(reqBody, &hostsBlocks)
	if err != nil {
		return nil, err
	}

	res := &liberrors.E{
		Code: stdhttp.StatusInternalServerError,
	}

	for _, hbx := range hostsBlocks {
		for x := 0; x < len(srv.env.HostsBlocks); x++ {
			hby := srv.env.HostsBlocks[x]
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
					return nil, res
				}
			} else {
				err = srv.hostsBlockDisable(hby)
				if err != nil {
					res.Message = err.Error()
					return nil, res
				}
				hby.IsEnabled = false
			}
		}
	}

	err = srv.env.write(srv.fileConfig)
	if err != nil {
		log.Println("apiHostsBlockUpdate:", err.Error())
		res.Message = err.Error()
		return nil, res
	}

	return json.Marshal(srv.env)
}

func (srv *Server) hostsBlockEnable(hb *hostsBlock) (err error) {
	hb.IsEnabled = true

	err = hb.unhide()
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		// File not exist, fetch new from server.
		err = hb.update()
		if err != nil {
			return err
		}
	}

	hfile, err := dns.ParseHostsFile(filepath.Join(dirHosts, hb.Name))
	if err != nil {
		return err
	}

	err = srv.dns.PopulateCachesByRR(hfile.Records, hfile.Path)
	if err != nil {
		return err
	}

	err = hb.update()
	if err != nil {
		return err
	}

	srv.env.HostsFiles[hfile.Name] = hfile

	return nil
}

func (srv *Server) hostsBlockDisable(hb *hostsBlock) (err error) {
	hfile, found := srv.env.HostsFiles[hb.Name]
	if !found {
		return fmt.Errorf("unknown hosts block: %q", hb.Name)
	}

	srv.dns.RemoveLocalCachesByNames(hfile.Names())

	err = hb.hide()
	if err != nil {
		return err
	}
	delete(srv.env.HostsFiles, hb.Name)

	return nil
}

func (srv *Server) apiHostsFileCreate(
	httpres stdhttp.ResponseWriter, httpreq *stdhttp.Request, _ []byte,
) (
	resbody []byte, err error,
) {
	name := httpreq.Form.Get(paramNameName)
	if len(name) == 0 {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusBadRequest,
			Message: "hosts file name is invalid or empty",
		}
	}

	_, found := srv.env.HostsFiles[name]
	if !found {
		path := filepath.Join(dirHosts, name)
		hfile, err := dns.NewHostsFile(path, nil)
		if err != nil {
			return nil, &liberrors.E{
				Code:    stdhttp.StatusInternalServerError,
				Message: err.Error(),
			}
		}
		srv.env.HostsFiles[hfile.Name] = hfile
	}

	httpres.WriteHeader(stdhttp.StatusCreated)

	return nil, nil
}

func (srv *Server) apiHostsFileGet(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, _ []byte,
) (
	resbody []byte, err error,
) {
	name := httpreq.Form.Get(paramNameName)

	hfile, found := srv.env.HostsFiles[name]
	if !found || hfile.Records == nil {
		return []byte("[]"), nil
	}

	return json.Marshal(&hfile.Records)
}

func (srv *Server) apiHostsFileDelete(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusOK,
	}

	name := httpreq.Form.Get(paramNameName)
	if len(name) == 0 {
		res.Message = "empty or invalid host file name"
		return nil, res
	}

	hfile, found := srv.env.HostsFiles[name]
	if !found {
		res.Message = "apiDeleteHostsFile: " + name + " not found"
		return nil, res
	}

	// Remove the records associated with hosts file.
	srv.dns.RemoveLocalCachesByNames(hfile.Names())

	err = hfile.Delete()
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	delete(srv.env.HostsFiles, name)

	res.Message = name + " has been deleted"
	return json.Marshal(res)
}

//
// apiHostsFileRRCreate create new record and save it to the hosts file.
//
func (srv *Server) apiHostsFileRRCreate(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, _ []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	hostsFileName := httpreq.Form.Get(paramNameName)
	if len(hostsFileName) == 0 {
		res.Message = "empty hosts file name in request path"
		return nil, res
	}

	hfile, found := srv.env.HostsFiles[hostsFileName]
	if !found {
		res.Message = "unknown hosts file name: " + hostsFileName
		return nil, res
	}

	rr := &dns.ResourceRecord{
		Class: dns.QueryClassIN,
	}

	rr.Name = httpreq.Form.Get(paramNameDomain)
	if len(rr.Name) == 0 {
		res.Message = "empty 'domain' query parameter"
		return nil, res
	}
	v := httpreq.Form.Get(paramNameValue)
	if len(v) == 0 {
		res.Message = "empty 'value' query parameter"
		return nil, res
	}
	rr.Type = dns.GetQueryTypeFromAddress([]byte(v))
	if rr.Type == 0 {
		res.Message = "invalid address value: " + v
		return nil, res
	}
	rr.Value = v

	err = hfile.AppendAndSaveRecord(rr)
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	err = srv.dns.PopulateCachesByRR([]*dns.ResourceRecord{rr}, hostsFileName)
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	return json.Marshal(rr)
}

func (srv *Server) apiHostsFileRRDelete(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	hostsFileName := httpreq.Form.Get(paramNameName)
	if len(hostsFileName) == 0 {
		res.Message = "empty hosts file name in request path"
		return nil, res
	}

	hfile, found := srv.env.HostsFiles[hostsFileName]
	if !found {
		res.Message = "unknown hosts file name: " + hostsFileName
		return nil, res
	}

	domainName := httpreq.Form.Get(paramNameDomain)
	if len(domainName) == 0 {
		res.Message = "empty 'domain' query parameter"
		return nil, res
	}

	found = hfile.RemoveRecord(domainName)
	if !found {
		res.Message = "unknown domain name: " + domainName
		return nil, res
	}
	err = hfile.Save()
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	srv.dns.RemoveLocalCachesByNames([]string{domainName})

	res.Code = stdhttp.StatusOK
	res.Message = "domain name '" + domainName + "' has been removed from hosts file"

	return json.Marshal(res)
}

func (srv *Server) apiMasterFileCreate(
	_ stdhttp.ResponseWriter,
	httpreq *stdhttp.Request,
	reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	zoneName := httpreq.Form.Get(paramNameName)
	if len(zoneName) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, res
	}

	if !libnet.IsHostnameValid([]byte(zoneName), true) {
		res.Message = "zone file name must be valid hostname"
		return nil, res
	}

	mf, ok := srv.env.ZoneFiles[zoneName]
	if ok {
		return json.Marshal(mf)
	}

	zoneFile := filepath.Join(dirMaster, zoneName)
	mf = dns.NewZoneFile(zoneFile, zoneName)
	err = mf.Save()
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	srv.env.ZoneFiles[zoneName] = mf

	return json.Marshal(mf)
}

func (srv *Server) apiMasterFileDelete(
	_ stdhttp.ResponseWriter,
	httpreq *stdhttp.Request,
	reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	zoneName := httpreq.Form.Get(paramNameName)
	if len(zoneName) == 0 {
		res.Message = "empty or invalid zone file name"
		return nil, res
	}

	mf, ok := srv.env.ZoneFiles[zoneName]
	if !ok {
		res.Message = "unknown zone file name " + zoneName
		return nil, res
	}

	names := make([]string, 0, len(mf.Records))
	for name := range mf.Records {
		names = append(names, name)
	}

	srv.dns.RemoveLocalCachesByNames(names)
	delete(srv.env.ZoneFiles, zoneName)

	err = mf.Delete()
	if err != nil {
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return nil, res
	}

	res.Code = stdhttp.StatusOK
	res.Message = zoneName + " has been deleted"

	return json.Marshal(res)
}

//
// apiMasterFileCreateRR create new RR for the master file.
//
func (srv *Server) apiMasterFileCreateRR(
	_ stdhttp.ResponseWriter,
	httpreq *stdhttp.Request,
	reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	zoneFileName := httpreq.Form.Get(paramNameName)
	if len(zoneFileName) == 0 {
		res.Message = "empty or invalid master file name"
		return nil, res
	}

	zoneFile := srv.env.ZoneFiles[zoneFileName]
	if zoneFile == nil {
		res.Message = "unknown master file name " + zoneFileName
		return nil, res
	}

	rrTypeValue := httpreq.Form.Get(paramNameType)
	rrType, err := strconv.Atoi(rrTypeValue)
	if err != nil {
		res.Message = fmt.Sprintf("invalid or empty RR type %q: %s",
			rrTypeValue, err.Error())
		return nil, res
	}

	rr := dns.ResourceRecord{}
	switch uint16(rrType) {
	case dns.QueryTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.QueryTypeMX:
		rr.Value = &dns.RDataMX{}
	}
	err = json.Unmarshal(reqbody, &rr)
	if err != nil {
		res.Message = "json.Unmarshal:" + err.Error()
		return nil, res
	}

	rr.Name = strings.TrimRight(rr.Name, ".")

	if rr.Type == dns.QueryTypePTR {
		if len(rr.Name) == 0 {
			res.Message = "empty PTR name"
			return nil, res
		}
		v := rr.Value.(string)
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

	listRR := []*dns.ResourceRecord{&rr}
	err = srv.dns.PopulateCachesByRR(listRR, zoneFile.Path)
	if err != nil {
		res.Message = "UpsertCacheByRR: " + err.Error()
		return nil, res
	}

	// Update the Master file.
	zoneFile.Add(&rr)
	err = zoneFile.Save()
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	return json.Marshal(&rr)
}

//
// apiMasterFileDeleteRR delete RR from the master file.
//
func (srv *Server) apiMasterFileDeleteRR(
	_ stdhttp.ResponseWriter,
	httpreq *stdhttp.Request,
	reqbody []byte,
) (
	resbody []byte, err error,
) {
	res := &liberrors.E{
		Code: stdhttp.StatusBadRequest,
	}

	zoneFileName := httpreq.Form.Get(paramNameName)
	if len(zoneFileName) == 0 {
		res.Message = "empty zone file name"
		return nil, res
	}

	mf := srv.env.ZoneFiles[zoneFileName]
	if mf == nil {
		res.Message = "unknown master file name " + zoneFileName
		return nil, res
	}

	v := httpreq.Form.Get(paramNameType)
	rrType, err := strconv.Atoi(v)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	rr := dns.ResourceRecord{}
	switch uint16(rrType) {
	case dns.QueryTypeSOA:
		rr.Value = &dns.RDataSOA{}
	case dns.QueryTypeMX:
		rr.Value = &dns.RDataMX{}
	}
	err = json.Unmarshal(reqbody, &rr)
	if err != nil {
		res.Message = "json.Unmarshal:" + err.Error()
		return nil, res
	}

	if len(rr.Name) == 0 {
		res.Message = "invalid or empty ResourceRecord.Name"
		return nil, res
	}

	// Remove the RR from caches.
	err = srv.dns.RemoveCachesByRR(&rr)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	// Remove the RR from zone file.
	err = mf.Remove(&rr)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	res.Code = stdhttp.StatusOK

	return json.Marshal(res)
}
