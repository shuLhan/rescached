// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

var _messagePool = sync.Pool{
	New: func() interface{} {
		return dns.NewMessage()
	},
}

//
// freeMessage put the message back to the pool.
//
func freeMessage(msg *dns.Message) {
	_messagePool.Put(msg)
}
