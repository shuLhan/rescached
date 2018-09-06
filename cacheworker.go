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
	addQueue       chan *dns.Message
	updateQueue    chan *response
	removeQueue    chan *response
	caches         *caches
	cachesRequest  *cachesRequest
	cachesList     *cachesList
	pruneDelay     time.Duration
	cacheThreshold time.Duration
}

func newCacheWorker(pruneDelay, cacheThreshold time.Duration) *cacheWorker {
	return &cacheWorker{
		addQueue:       make(chan *dns.Message, maxWorkerQueue),
		updateQueue:    make(chan *response, maxWorkerQueue),
		removeQueue:    make(chan *response, maxWorkerQueue),
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
		case msg := <-cw.addQueue:
			added := cw.add(msg, false)
			if !added {
				freeMessage(msg)
			}

		case res := <-cw.updateQueue:
			cw.update(res)

		case res := <-cw.removeQueue:
			cw.remove(res)
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
func (cw *cacheWorker) add(msg *dns.Message, isLocal bool) bool {
	if msg.Header.ANCount == 0 || len(msg.Answer) == 0 {
		log.Printf("! Empty answers on %s\n", msg.Question)
		return false
	}
	for x := 0; x < len(msg.Answer); x++ {
		if msg.Answer[x].TTL == 0 {
			log.Printf("! Zero TTL on %s\n", msg.Question)
			return false
		}
	}

	libbytes.ToLower(&msg.Question.Name)
	qname := string(msg.Question.Name)

	lres, res := cw.caches.get(qname, msg.Question.Type, msg.Question.Class)
	if lres == nil {
		res = newResponse(msg)
		if isLocal {
			res.receivedAt = 0
		}

		cw.caches.add(qname, res)

		if !isLocal {
			cw.cachesList.push(res)
		}

		if DebugLevel >= 1 && !isLocal {
			fmt.Printf("+ caching: %4d %10d %s\n",
				cw.cachesList.length(), res.accessedAt,
				res.message.Question)
		}
		return true
	}
	// Cache list contains other type.
	if res == nil {
		lres.add(msg, isLocal)
		return true
	}

	oldMsg := lres.update(res, msg)
	freeMessage(oldMsg)

	if !isLocal {
		cw.cachesList.fix(res)

		if DebugLevel >= 1 {
			fmt.Printf("+ update : %10d %s\n", res.accessedAt,
				res.message.Question)
		}
	}

	return true
}

func (cw *cacheWorker) update(res *response) {
	cw.cachesList.fix(res)

	if DebugLevel >= 1 {
		fmt.Printf("= cache  : %4d %10d %s\n", cw.cachesList.length(),
			res.accessedAt, res.message.Question)
	}
}

func (cw *cacheWorker) remove(res *response) {
	if res.el != nil {
		return
	}

	qname := string(res.message.Question.Name)

	cw.caches.remove(qname, res.message.Question.Type,
		res.message.Question.Class)

	fmt.Printf("= pruning: %4d %10d %s\n", cw.cachesList.length(),
		res.accessedAt, res.message.Question)

	res.el = nil
	res.message = nil
}

func (cw *cacheWorker) prune() {
	lres := cw.cachesList.prune()
	if len(lres) == 0 {
		return
	}

	for _, res := range lres {
		cw.removeQueue <- res
	}
}
