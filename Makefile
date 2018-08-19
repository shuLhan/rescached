## Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
## Use of this source code is governed by a BSD-style
## license that can be found in the LICENSE file.

.PHONY: install build test doc test.prof coverbrowse lint clean distclean
.DEFAULT: build

SRC:=$(shell go list -f '{{$$d:=.Dir}} {{ range .GoFiles }}{{$$d}}/{{.}} {{end}}' ./...)
SRC_TEST:=$(shell go list -f '{{$$d:=.Dir}} {{ range .TestGoFiles }}{{$$d}}/{{.}} {{end}}' ./...)

COVER_OUT:=cover.out
COVER_HTML:=cover.html
CPU_PROF:=cpu.prof
MEM_PROF:=mem.prof

RESCACHED_CFG:=./cmd/rescached/rescached.cfg
RESCACHED_BIN:=./rescached
RESCACHED_MAN:=./rescached.1.gz

build: test $(RESCACHED_BIN) doc

test: $(COVER_HTML)

test.prof:
	go test -count=1 -cpuprofile $(CPU_PROF) -memprofile $(MEM_PROF) ./...

$(COVER_HTML): $(COVER_OUT)
	go tool cover -html=$< -o $@

$(COVER_OUT): $(SRC) $(SRC_TEST)
	go test -count=1 -coverprofile=$@ ./...

coverbrowse: $(COVER_HTML)
	xdg-open $<

lint:
	golangci-lint run ./...

$(RESCACHED_BIN):
	go build -v ./cmd/rescached

doc: $(RESCACHED_MAN)

$(RESCACHED_MAN): README.adoc
	@a2x -v --doctype manpage --format manpage $< 2>/dev/null
	@gzip -f rescached.1

distclean: clean
	go clean -i ./...

clean:
	rm -f $(COVER_OUT) $(COVER_HTML)
	rm $(RESCACHED_BIN)

install: build
	sudo mkdir -p /etc/rescached
	sudo cp $(RESCACHED_CFG) /etc/rescached/

	sudo mkdir -p /usr/bin
	sudo cp -f $(RESCACHED_BIN) /usr/bin/
