// SPDX-FileCopyrightText: 2020 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/shuLhan/share/lib/test"
)

func TestBlockd_init(t *testing.T) {
	type testCase struct {
		desc string
		hb   Blockd
		exp  Blockd
	}

	var (
		testDirBase       = t.TempDir()
		pathDirBlock      = filepath.Join(testDirBase, dirBlock)
		fileEnabled       = "fileEnabled"
		fileDisabled      = "fileDisabled"
		fileNotExist      = "fileNotExist"
		hostsFileEnabled  = filepath.Join(pathDirBlock, fileEnabled)
		hostsFileDisabled = filepath.Join(pathDirBlock, "."+fileDisabled)

		fiEnabled  os.FileInfo
		fiDisabled os.FileInfo
		cases      []testCase
		c          testCase
		err        error
	)

	err = os.MkdirAll(pathDirBlock, 0700)
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
		hb: Blockd{
			Name: fileEnabled,
		},
		exp: Blockd{
			Name:         fileEnabled,
			lastUpdated:  fiEnabled.ModTime(),
			LastUpdated:  fiEnabled.ModTime().Format(lastUpdatedFormat),
			file:         hostsFileEnabled,
			fileDisabled: filepath.Join(pathDirBlock, "."+fileEnabled),
			IsEnabled:    true,
			isFileExist:  true,
		},
	}, {
		desc: "With hosts block file disabled",
		hb: Blockd{
			Name: fileDisabled,
		},
		exp: Blockd{
			Name:         fileDisabled,
			lastUpdated:  fiDisabled.ModTime(),
			LastUpdated:  fiDisabled.ModTime().Format(lastUpdatedFormat),
			file:         filepath.Join(pathDirBlock, fileDisabled),
			fileDisabled: hostsFileDisabled,
			isFileExist:  true,
		},
	}, {
		desc: "With hosts block file not exist",
		hb: Blockd{
			Name: fileNotExist,
		},
		exp: Blockd{
			Name:         fileNotExist,
			file:         filepath.Join(pathDirBlock, fileNotExist),
			fileDisabled: filepath.Join(pathDirBlock, "."+fileNotExist),
		},
	}}

	for _, c = range cases {
		c.hb.init(pathDirBlock)

		test.Assert(t, c.desc, c.exp, c.hb)
	}
}
