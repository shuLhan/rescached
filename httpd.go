// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"encoding/json"
	"fmt"
	"log"
	stdhttp "net/http"
	"os"

	liberrors "github.com/shuLhan/share/lib/errors"
	"github.com/shuLhan/share/lib/http"
)

const (
	defHTTPDRootDir = "_public/"
	paramNameName   = "name"
)

func (srv *Server) httpdInit() (err error) {
	env := &http.ServerOptions{
		Root:    defHTTPDRootDir,
		Address: srv.env.WuiListen,
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
		Path:         "/api/environment",
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
		Path:         "/api/environment",
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.httpdAPIPostEnvironment,
	}

	err = srv.httpd.RegisterEndpoint(epAPIPostEnvironment)
	if err != nil {
		return err
	}

	epAPIPostHostsBlock := &http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         "/api/hosts_block",
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiPostHostsBlock,
	}

	err = srv.httpd.RegisterEndpoint(epAPIPostHostsBlock)
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPut,
		Path:         "/api/hosts.d/:name",
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeNone,
		Call:         srv.apiHostsFileCreate,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodGet,
		Path:         "/api/hosts.d/:name",
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileGet,
	})
	if err != nil {
		return err
	}

	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodPost,
		Path:         "/api/hosts.d/:name",
		RequestType:  http.RequestTypeJSON,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileUpdate,
	})
	if err != nil {
		return err
	}
	err = srv.httpd.RegisterEndpoint(&http.Endpoint{
		Method:       http.RequestMethodDelete,
		Path:         "/api/hosts.d/:name",
		RequestType:  http.RequestTypeNone,
		ResponseType: http.ResponseTypeJSON,
		Call:         srv.apiHostsFileDelete,
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

	log.Printf("=== rescached: httpd listening at %s", srv.env.WuiListen)

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
	newOpts := new(environment)
	err = json.Unmarshal(reqBody, newOpts)
	if err != nil {
		return nil, err
	}

	newOpts.init()

	fmt.Printf("new options: %+v\n", newOpts)

	res := &liberrors.E{
		Code:    stdhttp.StatusOK,
		Message: "Restarting DNS server",
	}

	err = newOpts.write(srv.fileConfig)
	if err != nil {
		log.Println("httpdAPIPostEnvironment:", err.Error())
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return json.Marshal(res)
	}

	srv.env = newOpts

	srv.Stop()
	err = srv.Start()
	if err != nil {
		log.Println("httpdAPIPostEnvironment:", err.Error())
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
	}

	return json.Marshal(res)
}

func (srv *Server) apiPostHostsBlock(
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
		Code:    stdhttp.StatusOK,
		Message: "Restarting DNS server",
	}

	for x, hb := range hostsBlocks {
		fmt.Printf("apiPostHostsBlock[%d]: %+v\n", x, hb)
	}

	var mustRestart bool
	for _, hb := range srv.env.HostsBlocks {
		isUpdated := hb.update(hostsBlocks)
		if isUpdated {
			mustRestart = true
		}
	}

	err = srv.env.write(srv.fileConfig)
	if err != nil {
		log.Println("apiPostHostsBlock:", err.Error())
		res.Code = stdhttp.StatusInternalServerError
		res.Message = err.Error()
		return json.Marshal(res)
	}

	if mustRestart {
		srv.Stop()
		err = srv.Start()
		if err != nil {
			log.Println("apiPostHostsBlock:", err.Error())
			res.Code = stdhttp.StatusInternalServerError
			res.Message = err.Error()
		}
	}

	return json.Marshal(res)
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

	for _, hf := range srv.env.HostsFiles {
		if hf.Name == name {
			return nil, nil
		}
	}

	hfile, err := newHostsFile(name, nil)
	if err != nil {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusInternalServerError,
			Message: err.Error(),
		}
	}

	err = hfile.close()
	if err != nil {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusInternalServerError,
			Message: err.Error(),
		}
	}

	srv.env.HostsFiles = append(srv.env.HostsFiles, hfile)

	httpres.WriteHeader(stdhttp.StatusCreated)

	return nil, nil
}

func (srv *Server) apiHostsFileGet(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, _ []byte,
) (
	resbody []byte, err error,
) {
	hosts := make([]*host, 0)
	name := httpreq.Form.Get(paramNameName)

	for _, hfile := range srv.env.HostsFiles {
		if hfile.Name == name {
			hosts = hfile.hosts
			break
		}
	}

	return json.Marshal(&hosts)
}

func (srv *Server) apiHostsFileUpdate(
	_ stdhttp.ResponseWriter, httpreq *stdhttp.Request, reqbody []byte,
) (
	resbody []byte, err error,
) {
	var (
		hosts = make([]*host, 0)
		name  = httpreq.Form.Get(paramNameName)
		found bool
		hfile *hostsFile
	)

	err = json.Unmarshal(reqbody, &hosts)
	if err != nil {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusInternalServerError,
			Message: err.Error(),
		}
	}

	for _, hfile = range srv.env.HostsFiles {
		if hfile.Name == name {
			found = true
			break
		}
	}
	if !found {
		hfile, err = newHostsFile(name, hosts)
		if err != nil {
			return nil, &liberrors.E{
				Code:    stdhttp.StatusInternalServerError,
				Message: err.Error(),
			}
		}
		srv.env.HostsFiles = append(srv.env.HostsFiles, hfile)
	}

	oldHostnames := hfile.names()

	msgs, err := hfile.update(hosts)
	if err != nil {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusInternalServerError,
			Message: err.Error(),
		}
	}

	// Remove the records associated with hosts file.
	srv.dns.RemoveCachesByNames(oldHostnames)

	// Populate new hosts to cache.
	srv.dns.PopulateCaches(msgs)

	resbody, err = json.Marshal(&hfile.hosts)
	if err != nil {
		return nil, &liberrors.E{
			Code:    stdhttp.StatusInternalServerError,
			Message: err.Error(),
		}
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

	for x, hfile := range srv.env.HostsFiles {
		if hfile.Name != name {
			continue
		}

		// Remove the records associated with hosts file.
		srv.dns.RemoveCachesByNames(hfile.names())

		err = os.RemoveAll(hfile.Path)
		if err != nil {
			res.Message = err.Error()
			return nil, res
		}

		copy(srv.env.HostsFiles[x:], srv.env.HostsFiles[x+1:])
		srv.env.HostsFiles[len(srv.env.HostsFiles)-1] = nil
		srv.env.HostsFiles = srv.env.HostsFiles[:len(srv.env.HostsFiles)-1]

		res.Message = name + " has been deleted"
		return json.Marshal(res)
	}
	res.Message = "apiDeleteHostsFile: " + name + " not found"
	return nil, res
}
