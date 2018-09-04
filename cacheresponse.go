// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"container/list"
	"sync/atomic"
	"time"

	"github.com/shuLhan/share/lib/dns"
)

//
// cacheResponse represent internal cache of DNS response.
//
type cacheResponse struct {
	// Time where cache last accessed.
	accessedAt int64

	// Pointer to DNS response.
	v *dns.Response

	// Pointer to cache in list.
	el *list.Element
}

func newCacheResponse(res *dns.Response) *cacheResponse {
	return &cacheResponse{
		accessedAt: time.Now().Unix(),
		v:          res,
	}
}

func (cres *cacheResponse) AccessedAt() int64 {
	return atomic.LoadInt64(&cres.accessedAt)
}

func (cres *cacheResponse) update(res *dns.Response) *dns.Response {
	oldres := cres.v
	atomic.StoreInt64(&cres.accessedAt, time.Now().Unix())
	cres.v = res
	return oldres
}
