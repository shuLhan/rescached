// SPDX-FileCopyrightText: 2020 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	lastUpdatedFormat = "2006-01-02 15:04:05 MST"
)

// Blockd define the container for each block.d section in configuration.
type Blockd struct {
	lastUpdated time.Time

	Name string `ini:"::name"` // Derived from hostname in URL.
	URL  string `ini:"::url"`

	file         string
	fileDisabled string
	LastUpdated  string

	IsEnabled   bool // True if the hosts file un-hidden in block.d directory.
	isFileExist bool // True if the file exist and enabled or disabled.
}

// disable the hosts block by prefixing the file name with single dot.
func (hb *Blockd) disable() (err error) {
	err = os.Rename(hb.file, hb.fileDisabled)
	if err != nil {
		return fmt.Errorf("disable: %w", err)
	}
	hb.IsEnabled = false
	return nil
}

// enable the hosts block file by removing the dot prefix from file name.
func (hb *Blockd) enable() (err error) {
	if hb.isFileExist {
		err = os.Rename(hb.fileDisabled, hb.file)
	} else {
		err = os.WriteFile(hb.file, []byte(""), 0600)
	}
	if err != nil {
		return fmt.Errorf("enable: %w", err)
	}
	hb.IsEnabled = true
	hb.isFileExist = true
	return nil
}

func (hb *Blockd) init(pathDirBlock string) {
	var (
		fi  os.FileInfo
		err error
	)

	hb.file = filepath.Join(pathDirBlock, hb.Name)
	hb.fileDisabled = filepath.Join(pathDirBlock, "."+hb.Name)

	fi, err = os.Stat(hb.file)
	if err != nil {
		hb.IsEnabled = false

		fi, err = os.Stat(hb.fileDisabled)
		if err != nil {
			return
		}

		hb.isFileExist = true
	} else {
		hb.IsEnabled = true
		hb.isFileExist = true
	}

	hb.lastUpdated = fi.ModTime()
	hb.LastUpdated = hb.lastUpdated.Format(lastUpdatedFormat)
}

// isOld will return true if the host file has not been updated since seven
// days.
func (hb *Blockd) isOld() bool {
	oneWeek := 7 * 24 * time.Hour
	lastWeek := time.Now().Add(-1 * oneWeek)

	return hb.lastUpdated.Before(lastWeek)
}

func (hb *Blockd) update() (err error) {
	if !hb.isOld() {
		return nil
	}

	var logp = `Blockd.update`

	fmt.Printf("%s %s: updating ...\n", logp, hb.Name)

	err = os.MkdirAll(filepath.Dir(hb.file), 0700)
	if err != nil {
		return fmt.Errorf("%s %s: %w", logp, hb.Name, err)
	}

	var (
		req *http.Request
		res *http.Response
	)
	req, err = http.NewRequestWithContext(context.Background(), http.MethodGet, hb.URL, nil)
	if err != nil {
		return fmt.Errorf(`%s %s: %w`, logp, hb.Name, err)
	}
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("%s %s: %w", logp, hb.Name, err)
	}
	defer func() {
		var errClose = res.Body.Close()
		if errClose != nil {
			log.Printf("%s %q: %s", logp, hb.Name, err)
		}
	}()

	var body []byte

	body, err = io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("%s %q: %w", logp, hb.Name, err)
	}

	body = bytes.ReplaceAll(body, []byte("\r\n"), []byte("\n"))

	if hb.IsEnabled {
		err = os.WriteFile(hb.file, body, 0600)
	} else {
		err = os.WriteFile(hb.fileDisabled, body, 0600)
	}
	if err != nil {
		return fmt.Errorf("%s %q: %w", logp, hb.Name, err)
	}

	hb.lastUpdated = time.Now()
	hb.LastUpdated = hb.lastUpdated.Format(lastUpdatedFormat)

	return nil
}
