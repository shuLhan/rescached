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
	sync.RWMutex
	v *list.List
}

func newListResponse(res *dns.Response) (lres *listResponse) {
	lres = &listResponse{
		v: list.New(),
	}
	if res != nil {
		lres.v.PushBack(res)
	}
	return
}

//
// get cached response based on request type and class.
//
func (lres *listResponse) get(req *dns.Request) (res *dns.Response) {
	lres.RLock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		res = e.Value.(*dns.Response)
		if req.Message.Question.Type != res.Message.Question.Type {
			continue
		}
		if req.Message.Question.Class != res.Message.Question.Class {
			continue
		}
		lres.RUnlock()
		return
	}
	lres.RUnlock()
	return nil
}

//
// upsert update or insert response in cache.
//
func (lres *listResponse) upsert(res *dns.Response) {
	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		ev := e.Value.(*dns.Response)
		if res.Message.Question.Type != ev.Message.Question.Type {
			continue
		}
		if res.Message.Question.Class != ev.Message.Question.Class {
			continue
		}

		lres.v.Remove(e)
		freeResponse(ev)
		break
	}
	lres.v.PushBack(res)
	lres.Unlock()
}

//
// String convert all response in cache into string, as in slice.
//
func (lres *listResponse) String() string {
	var b strings.Builder

	b.WriteByte('[')
	first := true
	for e := lres.v.Front(); e != nil; e = e.Next() {
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
