// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"sync"
)

//
// caches represent a mapping between domain-name and cached responses.
//
type caches struct {
	v sync.Map
}

//
// get cached response based on request name, type, and class
//
func (c *caches) get(qname string, qtype, qclass uint16) (
	lres *listResponse, res *response,
) {
	v, ok := c.v.Load(qname)
	if !ok {
		return
	}

	lres = v.(*listResponse)
	res = lres.get(qtype, qclass)

	return
}

//
// add response to caches.
//
func (c *caches) add(key string, res *response) {
	lres := newListResponse(res)
	c.v.Store(key, lres)
}

//
// remove cache by name, type, and class; and return the cached response.
// If no record found it will return nil.
//
func (c *caches) remove(qname string, qtype, qclass uint16) *response {
	v, ok := c.v.Load(qname)
	if !ok {
		return nil
	}

	lres := v.(*listResponse)
	if lres.v.Len() == 0 {
		c.v.Delete(qname)
		return nil
	}

	return lres.remove(qtype, qclass)
}
