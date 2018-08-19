// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"net"
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

var _requestPool = sync.Pool{
	New: func() interface{} {
		req := &request{
			msg: dns.AllocMessage(),
		}
		return req
	},
}

//
// request represent a single request from client, including DNS message and
// their address.
//
type request struct {
	msg   *dns.Message
	raddr *net.UDPAddr
}

func freeRequest(req *request) {
	req.msg.Reset()
	_requestPool.Put(req)
}
