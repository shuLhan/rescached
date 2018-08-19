// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"fmt"
	"strings"
	"sync"
)

//
// cacheResponses represent cached DNS response.
//
type cacheResponses struct {
	sync.RWMutex
	v *list.List
}

func newCacheResponses(res *response) (cres *cacheResponses) {
	cres = &cacheResponses{
		v: list.New(),
	}
	if res != nil {
		cres.v.PushBack(res)
	}
	return
}

//
// get cached response based on query type and class.
//
func (cres *cacheResponses) get(req *request) (res *response) {
	cres.RLock()
	for e := cres.v.Front(); e != nil; e = e.Next() {
		res = e.Value.(*response)
		if req.msg.Question.Type != res.msg.Question.Type {
			continue
		}
		if req.msg.Question.Class != res.msg.Question.Class {
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
func (cres *cacheResponses) upsert(res *response) {
	cres.Lock()
	for e := cres.v.Front(); e != nil; e = e.Next() {
		ev := e.Value.(*response)
		if res.msg.Question.Type != ev.msg.Question.Type {
			continue
		}
		if res.msg.Question.Class != ev.msg.Question.Class {
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
		ev := e.Value.(*response)
		fmt.Fprintf(&b, "%s", ev)
	}
	b.WriteByte(']')

	return b.String()
}
