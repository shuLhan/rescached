// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"sort"
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
	cachesReq.Lock()
	var out strings.Builder

	keys := make([]string, 0, len(cachesReq.v))
	for key := range cachesReq.v {
		keys = append(keys, key)
	}

	sort.Strings(keys)

	out.WriteString("cachesRequest[")
	for x, k := range keys {
		if x > 0 {
			out.WriteByte(' ')
		}
		fmt.Fprintf(&out, "%s:%v", k, cachesReq.v[k])
	}
	out.WriteByte(']')
	cachesReq.Unlock()

	return out.String()
}

//
// length return number of keys in caches request.
//
func (cachesReq *cachesRequest) length() (n int) {
	cachesReq.Lock()
	n = len(cachesReq.v)
	cachesReq.Unlock()
	return
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
