// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"sync"

	"github.com/shuLhan/share/lib/dns"
)

var _responsePool = sync.Pool{
	New: func() interface{} {
		res := &dns.Response{
			Message: allocMessage(),
		}
		return res
	},
}

func freeResponse(res *dns.Response) {
	res.Message.Reset()
	_responsePool.Put(res)
}
