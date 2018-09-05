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

func newListResponse(res *response) (lres *listResponse) {
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
func (lres *listResponse) get(qtype, qclass uint16) *response {
	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		res := e.Value.(*response)
		if qtype != res.message.Question.Type {
			continue
		}
		if qclass != res.message.Question.Class {
			continue
		}
		lres.Unlock()
		return res
	}
	lres.Unlock()
	return nil
}

func (lres *listResponse) add(msg *dns.Message) *response {
	res := newResponse(msg)
	lres.Lock()
	lres.v.PushBack(res)
	lres.Unlock()
	return res
}

func (lres *listResponse) update(res *response, msg *dns.Message) *dns.Message {
	lres.Lock()
	oldMsg := res.update(msg)
	lres.Unlock()
	return oldMsg
}

func (lres *listResponse) remove(qtype, qclass uint16) *response {
	lres.Lock()
	for e := lres.v.Front(); e != nil; e = e.Next() {
		res := e.Value.(*response)
		if qtype != res.message.Question.Type {
			continue
		}
		if qclass != res.message.Question.Class {
			continue
		}
		lres.v.Remove(e)
		lres.Unlock()
		return res
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
		ev := e.Value.(*response)
		fmt.Fprintf(&b, "%+v", ev.message)
	}
	lres.Unlock()

	b.WriteByte(']')

	return b.String()
}
