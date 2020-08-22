// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/shuLhan/share/lib/dns"
)

type hostsFile struct {
	Name  string
	Path  string
	hosts []*dns.ResourceRecord
	out   *os.File
}

//
// convertHostsFile convert the dns HostsFile to our hostsFile for simple
// fetch and update.
//
func convertHostsFile(from *dns.HostsFile) (to *hostsFile) {
	to = &hostsFile{
		Name:  from.Name,
		Path:  from.Path,
		hosts: make([]*dns.ResourceRecord, 0, len(from.Messages)),
	}

	for _, msg := range from.Messages {
		if len(msg.Answer) == 0 {
			continue
		}

		to.hosts = append(to.hosts, &msg.Answer[0])
	}

	return to
}

func newHostsFile(name string, hosts []*dns.ResourceRecord) (hfile *hostsFile, err error) {
	if hosts == nil {
		hosts = make([]*dns.ResourceRecord, 0)
	}

	hfile = &hostsFile{
		Name:  name,
		Path:  filepath.Join(dirHosts, name),
		hosts: hosts,
	}

	hfile.out, err = os.OpenFile(hfile.Path, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}

	return hfile, nil
}

func (hfile *hostsFile) close() (err error) {
	err = hfile.out.Close()
	hfile.out = nil
	return err
}

//
// names return all hosts domain names.
//
func (hfile *hostsFile) names() (names []string) {
	names = make([]string, 0, len(hfile.hosts))
	for _, host := range hfile.hosts {
		names = append(names, host.Name)
	}
	return names
}

func (hfile *hostsFile) update(hosts []*dns.ResourceRecord) (
	msgs []*dns.Message, err error,
) {
	if hfile.out == nil {
		hfile.out, err = os.OpenFile(hfile.Path,
			os.O_CREATE|os.O_TRUNC|os.O_RDWR, 0600)
		if err != nil {
			return nil, err
		}
	} else {
		err = hfile.out.Truncate(0)
		if err != nil {
			return nil, err
		}
	}

	hfile.hosts = hfile.hosts[:0]

	for _, host := range hosts {
		if len(host.Name) == 0 || host.Value == nil {
			continue
		}
		hostValue, ok := host.Value.(string)
		if !ok {
			continue
		}
		msg := dns.NewMessageAddress(
			[]byte(host.Name),
			[][]byte{[]byte(hostValue)},
		)
		if msg == nil {
			continue
		}
		_, err = fmt.Fprintf(hfile.out, "%s %s\n", host.Value, host.Name)
		if err != nil {
			return nil, err
		}

		// Make sure the Name is in lowercases.
		host.Name = string(msg.Question.Name)

		msgs = append(msgs, msg)
		hfile.hosts = append(hfile.hosts, host)
	}

	err = hfile.close()
	if err != nil {
		return nil, err
	}

	return msgs, nil
}
