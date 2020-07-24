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
	hosts []*host
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
		hosts: make([]*host, 0, len(from.Messages)),
	}

	for _, msg := range from.Messages {
		if len(msg.Answer) == 0 {
			continue
		}

		host := convertRRToHost(&msg.Answer[0])
		if host != nil {
			to.hosts = append(to.hosts, host)
		}
	}

	return to
}

func newHostsFile(name string, hosts []*host) (hfile *hostsFile, err error) {
	if hosts == nil {
		hosts = make([]*host, 0)
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

func (hfile *hostsFile) update(hosts []*host) (msgs []*dns.Message, err error) {
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
		if len(host.Name) == 0 || len(host.Value) == 0 {
			continue
		}
		msg := dns.NewMessageAddress(
			[]byte(host.Name),
			[][]byte{[]byte(host.Value)},
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
