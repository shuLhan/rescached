// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"sync"
)

var _responsePool = sync.Pool{
	New: func() interface{} {
		res := &response{
			message: allocMessage(),
		}
		return res
	},
}

func freeResponse(res *response) {
	res.message.Reset()
	_responsePool.Put(res)
}
