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
	v sync.Map
}

func newCachesRequest() *cachesRequest {
	return new(cachesRequest)
}

//
// String return the string intepretation of content of cachesRequest.
//
func (cachesReq *cachesRequest) String() string {
	var out strings.Builder

	out.WriteString("cachesRequest[")
	x := 0
	cachesReq.v.Range(func(k, v interface{}) bool {
		if x == 0 {
			x++
		} else {
			out.WriteByte(' ')
		}
		key := k.(string)
		val := v.(*listRequest)
		fmt.Fprintf(&out, "%s:%v", key, val.String())
		return true
	})
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
	v, ok := cachesReq.v.Load(key)
	if !ok {
		listReq := newListRequest(req)
		cachesReq.v.Store(key, listReq)
		return false
	}

	listReq := v.(*listRequest)

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
	v, ok := cachesReq.v.Load(key)
	if !ok {
		return nil
	}

	var (
		isEmpty bool
		listReq = v.(*listRequest)
	)

	reqs, isEmpty = listReq.pops(qtype, qclass)

	if isEmpty {
		cachesReq.v.Delete(key)
	}

	return
}
