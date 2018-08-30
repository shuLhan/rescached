// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

//
// listRequest represent cached DNS request.
//
type listRequest struct {
	sync.Mutex
	v *list.List
}

func newListRequest(req *dns.Request) (listReq *listRequest) {
	listReq = &listRequest{
		v: list.New(),
	}
	if req != nil {
		listReq.v.PushBack(req)
	}
	return
}

func (listReq *listRequest) push(req *dns.Request) {
	listReq.Lock()
	listReq.v.PushBack(req)
	listReq.Unlock()
}

//
// isExist will return true if query type and class exist in list; otherwise
// it will return false.
//
func (listReq *listRequest) isExist(qtype, qclass uint16) (yes bool) {
	listReq.Lock()

	for e := listReq.v.Front(); e != nil; e = e.Next() {
		req := e.Value.(*dns.Request)
		if qtype != req.Message.Question.Type {
			continue
		}
		if qclass != req.Message.Question.Class {
			continue
		}
		yes = true
		break
	}

	listReq.Unlock()
	return
}

//
// pops detach request have the same query type and class from list and return
// it.
//
func (listReq *listRequest) pops(qtype, qclass uint16) (reqs []*dns.Request, isEmpty bool) {
	listReq.Lock()

	e := listReq.v.Front()
	for e != nil {
		next := e.Next()
		req := e.Value.(*dns.Request)
		if qtype != req.Message.Question.Type {
			e = next
			continue
		}
		if qclass != req.Message.Question.Class {
			e = next
			continue
		}
		listReq.v.Remove(e)
		reqs = append(reqs, req)
		e = next
	}

	if listReq.v.Len() == 0 {
		isEmpty = true
	}

	listReq.Unlock()
	return
}
