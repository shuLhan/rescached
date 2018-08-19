// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/shuLhan/share/lib/dns"
)

var _responsePool = sync.Pool{
	New: func() interface{} {
		res := &response{
			msg: dns.AllocMessage(),
		}
		return res
	},
}

//
// response represent a cached DNS response from name server.
//
type response struct {
	receivedAt int64
	msg        *dns.Message
	raddr      *net.UDPAddr
}

func freeResponse(res *response) {
	res.msg.Reset()
	_responsePool.Put(res)
}

//
// isExpired will return true if response message is expired, otherwise it
// will return false.
//
func (res *response) isExpired() bool {
	elapSeconds := uint32(time.Now().Unix() - res.receivedAt)

	return res.msg.IsExpired(elapSeconds)
}

//
// unpack message and set received time value to current time.
//
func (res *response) unpack() (err error) {
	err = res.msg.UnmarshalBinary(res.msg.Packet)
	if err != nil {
		return
	}

	res.receivedAt = time.Now().Unix()

	return
}

//
// String convert the response to string.
//
func (res *response) String() string {
	var b strings.Builder

	fmt.Fprintf(&b, "{receivedAt:%d msg:%+v raddr:%+v}", res.receivedAt,
		res.msg, res.raddr)

	return b.String()
}
