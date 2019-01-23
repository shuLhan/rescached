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
// listRequest represent list of active DNS requests.
// Each request is maintained as FIFO, where new request will be at the end of
// list.
//
type listRequest struct {
	sync.Mutex
	v *list.List
}

//
// newListRequest create and initialize new listRequest.
//
func newListRequest(req *dns.Request) (listReq *listRequest) {
	listReq = &listRequest{
		v: list.New(),
	}
	if req != nil {
		listReq.v.PushBack(req)
	}
	return
}

//
// String return string interpretation of listRequest as a slice.
//
func (listReq *listRequest) String() string {
	var out strings.Builder

	out.WriteByte('[')
	x := 0
	listReq.Lock()
	for e := listReq.v.Front(); e != nil; e = e.Next() {
		if x == 0 {
			x++
		} else {
			out.WriteByte(' ')
		}
		req := e.Value.(*dns.Request)
		fmt.Fprintf(&out, "&{Kind:%d Message.Question:%s}", req.Kind,
			req.Message.Question)
	}
	listReq.Unlock()
	out.WriteByte(']')

	return out.String()
}

//
// push new request to the end of list only if its not nil.
//
func (listReq *listRequest) push(req *dns.Request) {
	if req == nil {
		return
	}
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
// pops detach requests that have the same query type and class from list and
// return it.
//
func (listReq *listRequest) pops(qtype, qclass uint16) (
	reqs []*dns.Request, isEmpty bool,
) {
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
