// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"log"
	"sync"
	"sync/atomic"

	"github.com/shuLhan/share/lib/dns"
)

//
// caches represent a mapping between domain-name and cached responses.
//
type caches struct {
	n uint64
	v sync.Map
}

var _caches *caches

//
// newCaches create, initialize, and return new caches.
//
func newCaches() *caches {
	return &caches{}
}

//
// get cached response based on request name and type.
//
func (c *caches) get(req *dns.Request) *dns.Response {
	v, ok := c.v.Load(string(req.Message.Question.Name))
	if !ok {
		return nil
	}
	cres := v.(*cacheResponses)
	if cres == nil || cres.v == nil {
		return nil
	}
	return cres.get(req)
}

//
// put response to cache only if it's contains an answer and TTL is greater
// than zero (0).  If response contains no answer or TTL is zero it will
// return false, otherwise it will return true.
//
func (c *caches) put(res *dns.Response) bool {
	if res.Message.Header.ANCount == 0 || len(res.Message.Answer) == 0 {
		log.Printf("! Empty answers on %s\n", res.Message)
		return false
	}
	for x := 0; x < len(res.Message.Answer); x++ {
		if res.Message.Answer[x].TTL == 0 {
			log.Printf("! Empty TTL on %s\n", res.Message)
			return false
		}
	}

	qname := string(res.Message.Question.Name)
	v, ok := c.v.Load(qname)
	if !ok {
		cres := newCacheResponses(res)
		c.v.Store(qname, cres)
		atomic.AddUint64(&c.n, 1)
		return true
	}

	cres := v.(*cacheResponses)
	cres.upsert(res)

	return true
}

//
// LoadHostsFile parse hosts formatted file as put it into caches.
//
func LoadHostsFile(path string) {
	if DebugLevel >= 1 {
		if len(path) == 0 {
			log.Println("= Loading system hosts file")
		} else {
			log.Printf("= Loading hosts file '%s'", path)
		}
	}

	msgs, err := dns.HostsLoad(path)
	if err != nil {
		return
	}

	n := 0
	for x, msg := range msgs {
		res := &dns.Response{
			// Flag to indicated that this response is from local
			// hosts file.
			ReceivedAt: 0,
			Message:    msg,
		}

		ok := _caches.put(res)
		if !ok {
			res.Message.Reset()
		} else {
			n++
		}

		msgs[x] = nil
	}

	if DebugLevel >= 1 {
		log.Printf("== %d loaded\n", n)
	}
}
