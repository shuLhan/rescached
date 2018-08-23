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
// cacheResponses represent cached DNS response.
//
type cacheResponses struct {
	sync.RWMutex
	v *list.List
}

func newCacheResponses(res *dns.Response) (cres *cacheResponses) {
	cres = &cacheResponses{
		v: list.New(),
	}
	if res != nil {
		cres.v.PushBack(res)
	}
	return
}

//
// get cached response based on request type and class.
//
func (cres *cacheResponses) get(req *dns.Request) (res *dns.Response) {
	cres.RLock()
	for e := cres.v.Front(); e != nil; e = e.Next() {
		res = e.Value.(*dns.Response)
		if req.Message.Question.Type != res.Message.Question.Type {
			continue
		}
		if req.Message.Question.Class != res.Message.Question.Class {
			continue
		}
		cres.RUnlock()
		return
	}
	cres.RUnlock()
	return nil
}

//
// upsert update or insert response in cache.
//
func (cres *cacheResponses) upsert(res *dns.Response) {
	cres.Lock()
	for e := cres.v.Front(); e != nil; e = e.Next() {
		ev := e.Value.(*dns.Response)
		if res.Message.Question.Type != ev.Message.Question.Type {
			continue
		}
		if res.Message.Question.Class != ev.Message.Question.Class {
			continue
		}

		cres.v.Remove(e)
		freeResponse(ev)
		break
	}
	cres.v.PushBack(res)
	cres.Unlock()
}

//
// String convert all response in cache into string, as in slice.
//
func (cres *cacheResponses) String() string {
	var b strings.Builder

	b.WriteByte('[')
	first := true
	for e := cres.v.Front(); e != nil; e = e.Next() {
		if first {
			first = false
		} else {
			b.WriteByte(' ')
		}
		ev := e.Value.(*dns.Response)
		fmt.Fprintf(&b, "%+v", ev)
	}
	b.WriteByte(']')

	return b.String()
}
