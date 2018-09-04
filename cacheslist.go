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

func newCachesList(threshold time.Duration) *cachesList {
	return &cachesList{
		threshold: threshold,
		v:         list.New(),
	}
}

func (cl *cachesList) length() (n int) {
	cl.Lock()
	n = cl.v.Len()
	cl.Unlock()
	return n
}

func (cl *cachesList) push(cres *cacheResponse) {
	cl.Lock()
	cres.el = cl.v.PushBack(cres)
	cl.Unlock()
}

func (cl *cachesList) fix(cres *cacheResponse) {
	if cres == nil {
		return
	}

	cl.Lock()

	atomic.StoreInt64(&cres.accessedAt, time.Now().Unix())
	if cres.el != nil {
		cl.v.MoveToBack(cres.el)
	} else {
		cres.el = cl.v.PushBack(cres)
	}

	cl.Unlock()
}

func (cl *cachesList) prune() (lcres []*cacheResponse) {
	cl.Lock()

	var next *list.Element
	el := cl.v.Front()
	exp := time.Now().Add(cl.threshold).Unix()

	fmt.Println("= prune threshold:", exp)

	for el != nil {
		cres := el.Value.(*cacheResponse)
		if cres.AccessedAt() > exp {
			break
		}

		next = el.Next()

		cl.v.Remove(el)
		cres.el = nil
		lcres = append(lcres, cres)

		el = next
	}

	cl.Unlock()

	return
}
