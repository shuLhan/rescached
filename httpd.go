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
	"strconv"

	"github.com/shuLhan/share/lib/dns"
	liberrors "github.com/shuLhan/share/lib/errors"
	"github.com/shuLhan/share/lib/http"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defHTTPDRootDir     = "_public/"
	paramNameName       = "name"
	paramNameType       = "type"
	apiEnvironment      = "/api/environment"
	apiHostsBlock       = "/api/hosts_block"
	apiHostsDir         = "/api/hosts.d/:name"
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

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         apiHostsDir,
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileUpdate,
	})
	if err != nil {
		return err
	}
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

	srv.dns.RemoveCachesByNames(hfile.Names())

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

func (srv *Server) apiHostsFileUpdate(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, reqbody []byte,
) (
	resbody []byte, err error,
) {
	var (
		listRR = make([]*dns.ResourceRecord, 0)
		name   = httpreq.Form.Get(paramNameName)
	)
	res := &liberrors.E{
		Code:    stdhttp.StatusInternalServerError,
		Message: "internal server error",
	}

	err = json.Unmarshal(reqbody, &listRR)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	hfile, found := srv.env.HostsFiles[name]
	if !found {
		path := filepath.Join(dirHosts, name)
		hfile, err = dns.NewHostsFile(path, listRR)
		if err != nil {
			res.Message = err.Error()
			return nil, res
		}
		srv.env.HostsFiles[name] = hfile
	} else {
		oldHostnames := hfile.Names()

		// Remove the records associated with hosts file.
		srv.dns.RemoveCachesByNames(oldHostnames)

		// Save new records.
		hfile.Records = listRR
		err = hfile.Save()
		if err != nil {
			res.Message = err.Error()
			return nil, res
		}
	}

	// Populate new hosts to cache.
	err = srv.dns.PopulateCachesByRR(hfile.Records, hfile.Path)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	resbody, err = json.Marshal(&hfile.Records)
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	return resbody, nil
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
	srv.dns.RemoveCachesByNames(hfile.Names())

	err = hfile.Delete()
	if err != nil {
		res.Message = err.Error()
		return nil, res
	}

	delete(srv.env.HostsFiles, name)

	res.Message = name + " has been deleted"
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

	srv.dns.RemoveCachesByNames(names)
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

	masterFileName := httpreq.Form.Get(paramNameName)
	if len(masterFileName) == 0 {
		res.Message = "empty or invalid master file name"
		return nil, res
	}

	mf := srv.env.ZoneFiles[masterFileName]
	if mf == nil {
		res.Message = "unknown master file name " + masterFileName
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
		rr.Name = masterFileName
	} else {
		rr.Name += "." + masterFileName
	}

	// Reverse the value and name for PTR record.
	if rr.Type == dns.QueryTypePTR {
		tmp := rr.Name
		rr.Name = rr.Value.(string)
		rr.Value = tmp
	}

	listRR := []*dns.ResourceRecord{&rr}
	err = srv.dns.PopulateCachesByRR(listRR, mf.Path)
	if err != nil {
		res.Message = "UpsertCacheByRR: " + err.Error()
		return nil, res
	}

	// Update the Master file.
	mf.Add(&rr)
	err = mf.Save()
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

	masterFileName := httpreq.Form.Get(paramNameName)
	if len(masterFileName) == 0 {
		res.Message = "empty or invalid master file name"
		return nil, res
	}

	mf := srv.env.ZoneFiles[masterFileName]
	if mf == nil {
		res.Message = "unknown master file name " + masterFileName
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
