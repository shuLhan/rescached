// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"fmt"
	"strings"
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

//
// listResponse represent cached DNS response.
//
type listResponse struct {
	sync.Mutex
	v *list.List
}

func newListResponse(cres *cacheResponse) (lres *listResponse) {
	lres = &listResponse{
		v: list.New(),
	}
	if cres != nil {
		lres.v.PushBack(cres)
	}
	return
}

//
// get cached response based on request type and class.
//
func (lres *listResponse) get(qtype, qclass uint16) *cacheResponse {
	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		cres := e.Value.(*cacheResponse)
		if qtype != cres.v.Message.Question.Type {
			continue
		}
		if qclass != cres.v.Message.Question.Class {
			continue
		}
		lres.Unlock()
		return cres
	}
	lres.Unlock()
	return nil
}

func (lres *listResponse) add(res *dns.Response) *cacheResponse {
	cres := newCacheResponse(res)
	lres.Lock()
	lres.v.PushBack(cres)
	lres.Unlock()
	return cres
}

func (lres *listResponse) remove(qtype, qclass uint16) *cacheResponse {
	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		cres := e.Value.(*cacheResponse)
		if qtype != cres.v.Message.Question.Type {
			continue
		}
		if qclass != cres.v.Message.Question.Class {
			continue
		}
		lres.v.Remove(e)
		lres.Unlock()
		return cres
	}
	lres.Unlock()
	return nil
}

//
// String convert all response in cache into string, as in slice.
//
func (lres *listResponse) String() string {
	var b strings.Builder

	b.WriteByte('[')
	first := true

	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		if first {
			first = false
		} else {
			b.WriteByte(' ')
		}
		ev := e.Value.(*cacheResponse)
		fmt.Fprintf(&b, "%+v", ev.v)
	}
	lres.Unlock()

	b.WriteByte(']')

	return b.String()
}
