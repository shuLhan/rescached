// SPDX-FileCopyrightText: 2020 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/shuLhan/share/lib/test"
)

func TestHostsBlock_init(t *testing.T) {
	type testCase struct {
		desc string
		hb   hostsBlock
		exp  hostsBlock
	}

	var (
		testDirBase       = t.TempDir()
		testDirBlock      = filepath.Join(testDirBase, dirBlock)
		fileEnabled       = "fileEnabled"
		fileDisabled      = "fileDisabled"
		fileNotExist      = "fileNotExist"
		hostsFileEnabled  = filepath.Join(testDirBlock, fileEnabled)
		hostsFileDisabled = filepath.Join(testDirBlock, "."+fileDisabled)

		fiEnabled  os.FileInfo
		fiDisabled os.FileInfo
		cases      []testCase
		c          testCase
		err        error
	)

	err = os.MkdirAll(testDirBlock, 0700)
	if err != nil {
		t.Fatal(err)
	}

	err = os.WriteFile(hostsFileEnabled, []byte("127.0.0.2 localhost"), 0600)
	if err != nil {
		t.Fatal(err)
	}
	err = os.WriteFile(hostsFileDisabled, []byte("127.0.0.2 localhost"), 0600)
	if err != nil {
		t.Fatal(err)
	}

	fiEnabled, err = os.Stat(hostsFileEnabled)
	if err != nil {
		t.Fatal(err)
	}
	fiDisabled, err = os.Stat(hostsFileDisabled)
	if err != nil {
		t.Fatal(err)
	}

	cases = []testCase{{
		desc: "With hosts block file enabled",
		hb: hostsBlock{
			Name: fileEnabled,
		},
		exp: hostsBlock{
			Name:         fileEnabled,
			lastUpdated:  fiEnabled.ModTime(),
			LastUpdated:  fiEnabled.ModTime().Format(lastUpdatedFormat),
			file:         hostsFileEnabled,
			fileDisabled: filepath.Join(testDirBlock, "."+fileEnabled),
			IsEnabled:    true,
			isFileExist:  true,
		},
	}, {
		desc: "With hosts block file disabled",
		hb: hostsBlock{
			Name: fileDisabled,
		},
		exp: hostsBlock{
			Name:         fileDisabled,
			lastUpdated:  fiDisabled.ModTime(),
			LastUpdated:  fiDisabled.ModTime().Format(lastUpdatedFormat),
			file:         filepath.Join(testDirBlock, fileDisabled),
			fileDisabled: hostsFileDisabled,
			isFileExist:  true,
		},
	}, {
		desc: "With hosts block file not exist",
		hb: hostsBlock{
			Name: fileNotExist,
		},
		exp: hostsBlock{
			Name:         fileNotExist,
			file:         filepath.Join(testDirBlock, fileNotExist),
			fileDisabled: filepath.Join(testDirBlock, "."+fileNotExist),
		},
	}}

	for _, c = range cases {
		c.hb.init(testDirBase)

		test.Assert(t, c.desc, c.exp, c.hb)
	}
}
