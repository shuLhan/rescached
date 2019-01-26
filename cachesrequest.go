// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

//
// cachesRequest contains map of key (domain name) with list of request that
// have the same query type and class.
//
type cachesRequest struct {
	sync.Mutex
	v map[string]*listRequest
}

func newCachesRequest() *cachesRequest {
	return &cachesRequest{
		v: make(map[string]*listRequest),
	}
}

//
// String return the string interpretation of content of cachesRequest.
//
func (cachesReq *cachesRequest) String() string {
	var out strings.Builder

	out.WriteString("cachesRequest[")
	x := 0
	cachesReq.Lock()
	for key, val := range cachesReq.v {
		if x == 0 {
			x++
		} else {
			out.WriteByte(' ')
		}
		fmt.Fprintf(&out, "%s:%v", key, val.String())
	}
	cachesReq.Unlock()
	out.WriteByte(']')

	return out.String()
}

//
// push request to cache.  If the same request already exist, it will return
// true; otherwise it will return false.
//
func (cachesReq *cachesRequest) push(key string, req *dns.Request) (dup bool) {
	if len(key) == 0 {
		log.Println("cachesRequest.push: empty key")
		return false
	}
	if req == nil {
		log.Println("cachesRequest.push: empty request")
		return false
	}

	cachesReq.Lock()
	listReq, ok := cachesReq.v[key]
	if !ok {
		listReq = newListRequest(req)
		cachesReq.v[key] = listReq
		cachesReq.Unlock()
		return false
	}
	cachesReq.Unlock()

	dup = listReq.isExist(req.Message.Question.Type, req.Message.Question.Class)

	listReq.push(req)

	return
}

//
// pops remove request from cache that have the same query name, type, and
// class.
//
func (cachesReq *cachesRequest) pops(key string, qtype, qclass uint16) (
	reqs []*dns.Request,
) {
	cachesReq.Lock()
	listReq, ok := cachesReq.v[key]
	if !ok {
		cachesReq.Unlock()
		return nil
	}
	cachesReq.Unlock()

	var isEmpty bool

	reqs, isEmpty = listReq.pops(qtype, qclass)

	if isEmpty {
		cachesReq.Lock()
		delete(cachesReq.v, key)
		cachesReq.Unlock()
	}

	return
}
