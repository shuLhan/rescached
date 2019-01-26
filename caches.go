// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"sort"
	"strings"
	"sync"
)

//
// caches represent a mapping between domain-name and cached responses.
//
type caches struct {
	sync.Mutex
	v map[string]*listResponse
}

//
// newCaches create and initialize new caches.
//
func newCaches() *caches {
	return &caches{
		v: make(map[string]*listResponse),
	}
}

//
// get cached response based on request name, type, and class
//
func (c *caches) get(qname string, qtype, qclass uint16) (
	lres *listResponse, res *response,
) {
	c.Lock()
	lres, ok := c.v[qname]
	c.Unlock()
	if !ok {
		return
	}

	res = lres.get(qtype, qclass)

	return
}

//
// add response to caches.
//
func (c *caches) add(key string, res *response) {
	lres := newListResponse(res)
	c.Lock()
	c.v[key] = lres
	c.Unlock()
}

//
// remove cache by name, type, and class; and return the cached response.
// If no record found it will return nil.
//
func (c *caches) remove(qname string, qtype, qclass uint16) *response {
	c.Lock()
	lres, ok := c.v[qname]
	c.Unlock()
	if !ok {
		return nil
	}

	res := lres.remove(qtype, qclass)
	if lres.v.Len() == 0 {
		c.Lock()
		delete(c.v, qname)
		c.Unlock()
	}

	return res
}

//
// String return the string interpretation of content of caches ordered in
// ascending order by keys.
//
func (c *caches) String() string {
	c.Lock()
	var out strings.Builder

	keys := make([]string, 0, len(c.v))
	for key := range c.v {
		keys = append(keys, key)
	}

	sort.Strings(keys)

	out.WriteString("caches[")
	for x, k := range keys {
		val, ok := c.v[k]
		if ok {
			if x > 0 {
				out.WriteByte(' ')
			}
			out.WriteString(k)
			out.WriteByte(':')
			out.WriteString(val.String())
		}
	}
	out.WriteByte(']')
	c.Unlock()

	return out.String()
}
