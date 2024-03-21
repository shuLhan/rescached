// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"git.sr.ht/~shulhan/pakakeh.go/lib/dns"
)

// zoneRecordRequest contains the request parameters for adding or deleting
// record on zone.d.
type zoneRecordRequest struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Record    string `json:"record"`
	recordRaw []byte
	rtype     dns.RecordType
}
