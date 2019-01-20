// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

type cachesList struct {
	threshold time.Duration
	sync.Mutex
	v *list.List
}

//
// newCachesList create and initialize new cachesList.
// The threshold value MUST be negative duration or it will be converted to
// negative based on current value.
//
func newCachesList(threshold time.Duration) *cachesList {
	if threshold > 0 {
		threshold *= -1
	}
	return &cachesList{
		threshold: threshold,
		v:         list.New(),
	}
}

//
// items return content of list as slice of response.
//
func (cl *cachesList) items() (items []*response) {
	el := cl.v.Front()

	for el != nil {
		res := el.Value.(*response)

		items = append(items, res)

		el = el.Next()
	}

	return
}

func (cl *cachesList) length() (n int) {
	cl.Lock()
	n = cl.v.Len()
	cl.Unlock()
	return n
}

//
// push the new response to the end of list.
// This function assume that the response.accessedAt time is using current
// timestamp (greater or equal with last item in list).
//
func (cl *cachesList) push(res *response) {
	if res == nil {
		return
	}
	cl.Lock()
	res.el = cl.v.PushBack(res)
	cl.Unlock()
}

func (cl *cachesList) fix(res *response) {
	if res == nil {
		return
	}

	cl.Lock()

	atomic.StoreInt64(&res.accessedAt, time.Now().Unix())
	if res.el != nil {
		cl.v.MoveToBack(res.el)
	} else {
		res.el = cl.v.PushBack(res)
	}

	cl.Unlock()
}

func (cl *cachesList) prune() (lres []*response) {
	cl.Lock()

	var next *list.Element
	el := cl.v.Front()
	exp := time.Now().Add(cl.threshold).Unix()

	fmt.Println("= prune threshold:", exp)

	for el != nil {
		res := el.Value.(*response)
		if res.AccessedAt() > exp {
			break
		}

		next = el.Next()

		cl.v.Remove(el)
		res.el = nil
		lres = append(lres, res)

		el = next
	}

	cl.Unlock()

	return
}
