// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import "github.com/shuLhan/share/lib/dns"

// host contains simplified DNS record.
type host struct {
	Name  string
	Type  int
	Class int
	Value string
	TTL   int
}

func convertRRToHost(from *dns.ResourceRecord) (to *host) {
	to = &host{
		Name:  string(from.Name),
		Type:  int(from.Type),
		Class: int(from.Class),
		TTL:   int(from.TTL),
	}
	switch from.Type {
	case dns.QueryTypeA, dns.QueryTypeNS, dns.QueryTypeCNAME,
		dns.QueryTypeMB, dns.QueryTypeMG, dns.QueryTypeMR,
		dns.QueryTypeNULL, dns.QueryTypePTR, dns.QueryTypeTXT,
		dns.QueryTypeAAAA:
		to.Value = from.Value.(string)
	}

	return to
}
