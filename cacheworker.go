// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"time"

	libbytes "github.com/shuLhan/share/lib/bytes"
	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
)

const (
	maxWorkerQueue = 32
)

//
// cacheWorker is a worker that manage cache in map and list.
// Any addition, update, or remove to cache go through this worker.
//
type cacheWorker struct {
	upsertQueue chan *dns.Message
	caches      *caches
	cachesList  *cachesList
	pruneDelay  time.Duration
}

//
// newCacheWorker create and initialize worker with a timer to prune the cache
// (cacheDelay) and a duration for cache to be considered to be pruned.
//
func newCacheWorker(pruneDelay, cacheThreshold time.Duration) *cacheWorker {
	return &cacheWorker{
		upsertQueue: make(chan *dns.Message, maxWorkerQueue),
		caches:      newCaches(),
		cachesList:  newCachesList(cacheThreshold),
		pruneDelay:  pruneDelay,
	}
}

func (cw *cacheWorker) start() {
	go cw.pruneWorker()

	for msg := range cw.upsertQueue {
		_ = cw.upsert(msg, false)
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
// upsert update or insert a DNS message to caches in map and in the list.
// It will return true if response is added or updated in cache, otherwise it
// will return false.
//
func (cw *cacheWorker) upsert(msg *dns.Message, isLocal bool) bool {
	if msg == nil {
		return false
	}
	if msg.Header.RCode != dns.RCodeOK {
		log.Printf("! Response error: %d %s\n", msg.Header.RCode,
			msg.Question)
		return false
	}

	libbytes.ToLower(&msg.Question.Name)
	qname := string(msg.Question.Name)

	lres, res := cw.caches.get(qname, msg.Question.Type, msg.Question.Class)
	if lres == nil {
		cw.push(qname, msg, isLocal)
		return true
	}
	// Cache list contains other type.
	if res == nil {
		res = lres.add(msg, isLocal)
		if !isLocal {
			cw.cachesList.push(res)
		}
		return true
	}

	_ = lres.update(res, msg)

	if !isLocal {
		cw.cachesList.fix(res)

		if debug.Value >= 1 {
			fmt.Printf("+ update : %4c %10d %s\n", '-', res.accessedAt,
				res.message.Question)
		}
	}

	return true
}

//
// push new DNS message with domain-name "qname" as a key on map.
// If isLocal is false, the message will also pushed to cachesList.
//
func (cw *cacheWorker) push(qname string, msg *dns.Message, isLocal bool) {
	res := newResponse(msg)
	if isLocal {
		res.receivedAt = 0
	}

	cw.caches.add(qname, res)

	if !isLocal {
		cw.cachesList.push(res)

		if debug.Value >= 1 {
			fmt.Printf("+ caching: %4d %10d %s\n",
				cw.cachesList.length(), res.accessedAt,
				res.message.Question)
		}
	}
}

func (cw *cacheWorker) update(res *response) {
	cw.cachesList.fix(res)

	if debug.Value >= 1 {
		fmt.Printf("= cache  : %4d %10d %s\n", cw.cachesList.length(),
			res.accessedAt, res.message.Question)
	}
}

func (cw *cacheWorker) remove(res *response) {
	if res == nil || res.message == nil {
		return
	}
	if res.el != nil {
		return
	}

	qname := string(res.message.Question.Name)

	cw.caches.remove(qname, res.message.Question.Type,
		res.message.Question.Class)

	if debug.Value > 0 {
		fmt.Printf("= pruning: %4d %10d %s\n", cw.cachesList.length(),
			res.accessedAt, res.message.Question)
	}

	res.el = nil
	res.message = nil
}

func (cw *cacheWorker) prune() {
	lres := cw.cachesList.prune()
	if len(lres) == 0 {
		return
	}

	for _, res := range lres {
		cw.remove(res)
	}
	fmt.Printf("= pruning %d records\n", len(lres))
}
