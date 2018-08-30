// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"time"

	libbytes "github.com/shuLhan/share/lib/bytes"
	"github.com/shuLhan/share/lib/dns"
)

const (
	maxWorkerQueue = 32
)

type cacheWorker struct {
	addQueue       chan *dns.Response
	updateQueue    chan *cacheResponse
	removeQueue    chan *cacheResponse
	caches         *caches
	cachesRequest  *cachesRequest
	cachesList     *cachesList
	pruneDelay     time.Duration
	cacheThreshold time.Duration
}

func newCacheWorker(pruneDelay, cacheThreshold time.Duration) *cacheWorker {
	return &cacheWorker{
		addQueue:       make(chan *dns.Response, maxWorkerQueue),
		updateQueue:    make(chan *cacheResponse, maxWorkerQueue),
		removeQueue:    make(chan *cacheResponse, maxWorkerQueue),
		caches:         newCaches(),
		cachesRequest:  newCachesRequest(),
		cachesList:     newCachesList(cacheThreshold),
		pruneDelay:     pruneDelay,
		cacheThreshold: cacheThreshold,
	}
}

func (cw *cacheWorker) start() {
	go cw.pruneWorker()

	for {
		select {
		case res := <-cw.addQueue:
			cw.add(res, true)

		case cres := <-cw.updateQueue:
			cw.update(cres)

		case cres := <-cw.removeQueue:
			cw.remove(cres)
		}
	}
}

func (cw *cacheWorker) pruneWorker() {
	ticker := time.NewTicker(cw.pruneDelay)

	defer ticker.Stop()

	for t := range ticker.C {
		fmt.Printf("= pruning at %v\n", t)

		cw.prune()
	}
}

//
// add DNS response to caches in map and in the list.
// It will return true if response is added or updated in cache, otherwise it
// will return false.
//
func (cw *cacheWorker) add(res *dns.Response, addToList bool) bool {
	if res.Message.Header.ANCount == 0 || len(res.Message.Answer) == 0 {
		log.Printf("! Empty answers on %s\n", res.Message.Question)
		return false
	}
	for x := 0; x < len(res.Message.Answer); x++ {
		if res.Message.Answer[x].TTL == 0 {
			log.Printf("! Zero TTL on %s\n", res.Message.Question)
			return false
		}
	}

	libbytes.ToLower(&res.Message.Question.Name)
	qname := string(res.Message.Question.Name)

	lres, cres := cw.caches.get(qname, res.Message.Question.Type,
		res.Message.Question.Class)
	if lres == nil {
		cres = newCacheResponse(res)

		cw.caches.add(qname, cres)

		if addToList {
			cw.cachesList.push(cres)
		}

		if DebugLevel >= 1 && addToList {
			fmt.Printf("+ caching: %4d %10d %s\n",
				cw.cachesList.length(), cres.accessedAt,
				res.Message.Question)
		}
		return true
	}
	// Cache list contains other type.
	if cres == nil {
		lres.add(res)
		return true
	}

	oldRes := cres.update(res)
	freeResponse(oldRes)

	if addToList {
		cw.cachesList.fix(cres)

		if DebugLevel >= 1 {
			fmt.Printf("+ update : %10d %s\n", cres.accessedAt,
				res.Message.Question)
		}
	}

	return true
}

func (cw *cacheWorker) update(cres *cacheResponse) {
	cw.cachesList.fix(cres)

	fmt.Printf("= cache  : %4d %10d %s\n", cw.cachesList.length(),
		cres.accessedAt, cres.v.Message.Question)
}

func (cw *cacheWorker) remove(cres *cacheResponse) {
	if cres.el != nil {
		return
	}

	qname := string(cres.v.Message.Question.Name)

	cw.caches.remove(qname, cres.v.Message.Question.Type,
		cres.v.Message.Question.Class)

	fmt.Printf("= pruning: %4d %10d %s\n", cw.cachesList.length(),
		cres.accessedAt, cres.v.Message.Question)

	cres.el = nil
	cres.v = nil
}

func (cw *cacheWorker) prune() {
	lcres := cw.cachesList.prune()
	if len(lcres) == 0 {
		return
	}

	for _, cres := range lcres {
		cw.removeQueue <- cres
	}
}
