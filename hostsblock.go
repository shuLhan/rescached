// Copyright 2020, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

//
// List of blocked hosts sources.
//
var hostsBlockSources = []*hostsBlock{{
	Name: "pgl.yoyo.org",
	URL:  `http://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&startdate[day]=&startdate[month]=&startdate[year]=&mimetype=plaintext`,
}, {
	Name: "www.malwaredomainlist.com",
	URL:  `http://www.malwaredomainlist.com/hostslist/hosts.txt`,
}, {
	Name: "winhelp2002.mvps.org",
	URL:  `http://winhelp2002.mvps.org/hosts.txt`,
}, {
	Name: "someonewhocares.org",
	URL:  `http://someonewhocares.org/hosts/hosts`,
}}

type hostsBlock struct {
	Name        string // Derived from hostname in URL.
	URL         string
	LastUpdated string
	IsEnabled   bool
	lastUpdated time.Time
	file        string
}

func (hb *hostsBlock) init(sources []string) {
	for _, src := range sources {
		if hb.URL == src {
			hb.IsEnabled = true
			break
		}
	}

	hb.initLastUpdated()
}

func (hb *hostsBlock) update() bool {
	if !hb.IsEnabled {
		return false
	}

	if !hb.isOld() {
		return false
	}

	fmt.Printf("hostsBlock %s: updating ...\n", hb.Name)

	res, err := http.Get(hb.URL)
	if err != nil {
		log.Printf("hostsBlock.update %q: %s", hb.Name, err)
		return false
	}
	defer func() {
		err := res.Body.Close()
		if err != nil {
			log.Printf("hostsBlock.update %q: %s", hb.Name, err)
		}
	}()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Printf("hostsBlock.update %q: %s", hb.Name, err)
		return false
	}

	body = bytes.ReplaceAll(body, []byte("\r\n"), []byte("\n"))

	err = ioutil.WriteFile(hb.file, body, 0644)
	if err != nil {
		log.Printf("hostsBlock.update %q: %s", hb.Name, err)
		return false
	}

	return true
}

func (hb *hostsBlock) hide() (err error) {
	oldFileName := filepath.Join(dirHosts, hb.Name)
	newFileName := filepath.Join(dirHosts, "."+hb.Name)
	err = os.Rename(oldFileName, newFileName)
	if err != nil {
		return err
	}

	hb.file = newFileName

	return nil
}

func (hb *hostsBlock) isOld() bool {
	oneWeek := 7 * 24 * time.Hour
	lastWeek := time.Now().Add(-1 * oneWeek)

	return hb.lastUpdated.Before(lastWeek)
}

//
// unhide the hosts block file.
//
func (hb *hostsBlock) unhide() (err error) {
	oldFileName := filepath.Join(dirHosts, "."+hb.Name)
	newFileName := filepath.Join(dirHosts, hb.Name)
	err = os.Rename(oldFileName, newFileName)
	if err != nil {
		return err
	}

	hb.file = newFileName
	hb.initLastUpdated()

	return nil
}

func (hb *hostsBlock) initLastUpdated() {
	hb.file = filepath.Join(dirHosts, hb.Name)
	fi, err := os.Stat(hb.file)
	if err != nil {
		hb.IsEnabled = false
		return
	}

	hb.lastUpdated = fi.ModTime()
	hb.LastUpdated = hb.lastUpdated.Format("2006-01-02 15:04:05 MST")
}
