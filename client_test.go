// SPDX-FileCopyrightText: 2022 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"os"
	"testing"
	"time"

	"github.com/shuLhan/share/lib/test"
)

func TestClient_BlockdEnable(t *testing.T) {
	type testCase struct {
		desc      string
		name      string
		expError  string
		expBlockd Blockd
	}

	var (
		cases     []testCase
		c         testCase
		gotBlockd *Blockd
		err       error
	)

	cases = []testCase{{
		desc:     "With invalid block.d name",
		name:     "xxx",
		expError: "BlockdEnable: 400 hosts block.d name not found: xxx",
	}, {
		desc: "With valid block.d name",
		name: "a.block",
		expBlockd: Blockd{
			Name:      "a.block",
			URL:       "http://127.0.0.1:11180/hosts/a",
			IsEnabled: true,
		},
	}}

	for _, c = range cases {
		gotBlockd, err = resc.BlockdEnable(c.name)
		if err != nil {
			test.Assert(t, "error", c.expError, err.Error())
			continue
		}

		gotBlockd.LastUpdated = ""

		test.Assert(t, c.desc, c.expBlockd, *gotBlockd)
	}
}

func TestClient_BlockdDisable(t *testing.T) {
	type testCase struct {
		desc      string
		name      string
		expError  string
		expBlockd Blockd
	}

	var (
		cases     []testCase
		c         testCase
		gotBlockd *Blockd
		err       error
	)

	cases = []testCase{{
		desc:     "With invalid block.d name",
		name:     "xxx",
		expError: "BlockdDisable: 400 hosts block.d name not found: xxx",
	}, {
		desc: "With valid block.d name",
		name: "a.block",
		expBlockd: Blockd{
			Name:      "a.block",
			URL:       "http://127.0.0.1:11180/hosts/a",
			IsEnabled: false,
		},
	}}

	for _, c = range cases {
		gotBlockd, err = resc.BlockdDisable(c.name)
		if err != nil {
			test.Assert(t, "error", c.expError, err.Error())
			continue
		}

		gotBlockd.LastUpdated = ""

		test.Assert(t, c.desc, c.expBlockd, *gotBlockd)
	}
}

func TestClient_BlockdFetch(t *testing.T) {
	var (
		affectedBlockd = testEnv.HostBlockd["a.block"]

		gotBlockd *Blockd
		expBlockd *Blockd
		expString string
		gotBytes  []byte
		err       error
	)

	// Revert the content of a.block.
	t.Cleanup(func() {
		err = os.WriteFile(affectedBlockd.fileDisabled, []byte("127.0.0.1 a.block\n"), 0644)
	})

	expString = "BlockdFetch: 400 httpApiBlockdFetch: unknown hosts block.d name: xxx"

	gotBlockd, err = resc.BlockdFetch("xxx")
	if err != nil {
		test.Assert(t, "error", expString, err.Error())
	} else {
		test.Assert(t, "BlockdFetch", expBlockd, gotBlockd)
	}

	expBlockd = &Blockd{
		Name:      "a.block",
		URL:       "http://127.0.0.1:11180/hosts/a",
		IsEnabled: false,
	}

	// Make the block.d last updated less than 7 days ago.
	testEnv.HostBlockd["a.block"].lastUpdated = time.Now().Add(-1 * 10 * 24 * time.Hour)

	gotBlockd, err = resc.BlockdFetch("a.block")
	if err != nil {
		t.Fatal(err)
	}

	expBlockd.LastUpdated = gotBlockd.LastUpdated

	test.Assert(t, "BlockdFetch", expBlockd, gotBlockd)

	gotBytes, err = os.ReadFile(affectedBlockd.fileDisabled)
	if err != nil {
		t.Fatal(err)
	}

	expString = "127.0.0.2 a.block\n"

	test.Assert(t, "BlockdFetch", expString, string(gotBytes))
}
