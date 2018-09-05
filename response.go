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
// response represent internal DNS response for caching.
//
type response struct {
	// Time when message is received.
	receivedAt int64
	// Time when message last accessed in cache.
	accessedAt int64
	message    *dns.Message
	// Pointer to response element in list.
	el *list.Element
}

func newResponse(msg *dns.Message) *response {
	curtime := time.Now().Unix()
	return &response{
		receivedAt: curtime,
		accessedAt: curtime,
		message:    msg,
	}
}

func (res *response) AccessedAt() int64 {
	return atomic.LoadInt64(&res.accessedAt)
}

//
// isExpired will return true if response message is expired, otherwise it
// will return false.
//
func (res *response) isExpired() bool {
	// Local responses from hosts file will never be expired.
	if res.receivedAt == 0 {
		return false
	}

	elapSeconds := uint32(time.Now().Unix() - res.receivedAt)

	return res.message.IsExpired(elapSeconds)
}

func (res *response) update(newMsg *dns.Message) *dns.Message {
	oldMsg := res.message
	atomic.StoreInt64(&res.accessedAt, time.Now().Unix())
	res.message = newMsg
	return oldMsg
}
