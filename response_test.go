// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"github.com/shuLhan/share/lib/dns"
)

var _testResponses = []*response{{
	message: &dns.Message{
		Packet: []byte{1},
		Header: &dns.SectionHeader{
			ANCount: 1,
		},
		Question: &dns.SectionQuestion{
			Name:  []byte("1"),
			Type:  1,
			Class: 1,
		},
		Answer: []*dns.ResourceRecord{{
			TTL: 1,
		}},
	},
}, {
	message: &dns.Message{
		Packet: []byte{2},
		Header: &dns.SectionHeader{
			ANCount: 1,
		},
		Question: &dns.SectionQuestion{
			Name:  []byte("2"),
			Type:  2,
			Class: 1,
		},
		Answer: []*dns.ResourceRecord{{
			TTL: 1,
		}},
	},
}, {
	message: &dns.Message{
		Packet: []byte{1, 1},
		Header: &dns.SectionHeader{
			ANCount: 1,
		},
		Question: &dns.SectionQuestion{
			Name:  []byte("1"),
			Type:  1,
			Class: 1,
		},
		Answer: []*dns.ResourceRecord{{
			TTL: 1,
		}},
	},
}}
