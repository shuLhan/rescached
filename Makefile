## Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
## Use of this source code is governed by a BSD-style
## license that can be found in the LICENSE file.

.PHONY: build debug install uninstall
.PHONY: test test.prof coverbrowse lint
.PHONY: doc
.PHONY: clean distclean

SRC:=$(shell go list -f '{{$$d:=.Dir}} {{ range .GoFiles }}{{$$d}}/{{.}} {{end}}' ./...)
SRC_TEST:=$(shell go list -f '{{$$d:=.Dir}} {{ range .TestGoFiles }}{{$$d}}/{{.}} {{end}}' ./...)

COVER_OUT:=cover.out
COVER_HTML:=cover.html
CPU_PROF:=cpu.prof
MEM_PROF:=mem.prof
DEBUG=

RESCACHED_BIN:=rescached
RESCACHED_MAN:=rescached.1.gz

RESCACHED_CFG:=cmd/rescached/rescached.cfg
RESCACHED_CFG_MAN:=doc/rescached.cfg.5.gz

RESOLVER_BIN:=resolver
RESOLVER_MAN:=doc/resolver.1.gz

RESOLVERBENCH_BIN:=resolverbench

build: test $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN) doc

debug: DEBUG=-race -v
debug: test $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN) doc

test: $(COVER_HTML)

test.prof:
	export CGO_ENABLED=1 && \
		go test $(DEBUG) -count=1 \
			-cpuprofile $(CPU_PROF) \
			-memprofile $(MEM_PROF) ./...

$(COVER_HTML): $(COVER_OUT)
	go tool cover -html=$< -o $@

$(COVER_OUT): $(SRC) $(SRC_TEST)
	export CGO_ENABLED=1 && \
		go test $(DEBUG) -count=1 -coverprofile=$@ ./...

coverbrowse: $(COVER_HTML)
	xdg-open $<

lint:
	golangci-lint run ./...

$(RESCACHED_BIN): $(SRC)
	export CGO_ENABLED=1 && \
		go build $(DEBUG) ./cmd/rescached

$(RESOLVER_BIN): $(SRC)
	export CGO_ENABLED=1 && \
		go build $(DEBUG) ./cmd/resolver

$(RESOLVERBENCH_BIN): $(SRC)
	export CGO_ENABLED=1 && \
		go build $(DEBUG) ./cmd/resolverbench

doc: $(RESCACHED_MAN) $(RESCACHED_CFG_MAN) $(RESOLVER_MAN)

$(RESCACHED_MAN): README.adoc
	a2x --doctype manpage --format manpage $< >/dev/null 2>&1
	gzip -f rescached.1

$(RESCACHED_CFG_MAN): doc/rescached.cfg.adoc
	a2x --doctype manpage --format manpage $< >/dev/null 2>&1
	gzip -f doc/rescached.cfg.5

$(RESOLVER_MAN): doc/resolver.adoc
	a2x --doctype manpage --format manpage $< >/dev/null 2>&1
	gzip -f doc/resolver.1

distclean: clean
	go clean -i ./...

clean:
	rm -f testdata/rescached.pid
	rm -f $(COVER_OUT) $(COVER_HTML)
	rm -f $(RESCACHED_MAN) $(RESOLVER_MAN) $(RESCACHED_CFG_MAN)
	rm -f $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)

install: build
	mkdir -p $(PREFIX)/etc/rescached
	mkdir -p $(PREFIX)/etc/rescached/hosts.d
	mkdir -p $(PREFIX)/etc/rescached/master.d
	cp $(RESCACHED_CFG)    $(PREFIX)/etc/rescached/
	cp scripts/hosts.block $(PREFIX)/etc/rescached/hosts.d/

	mkdir -p               $(PREFIX)/usr/bin
	cp -f $(RESCACHED_BIN) $(PREFIX)/usr/bin/
	cp -f $(RESOLVER_BIN)  $(PREFIX)/usr/bin/
	cp scripts/rescached-update-hosts-block.sh $(PREFIX)/usr/bin/

	mkdir -p                $(PREFIX)/usr/share/man/man{1,5}
	cp $(RESCACHED_MAN)     $(PREFIX)/usr/share/man/man1/
	cp $(RESOLVER_MAN)      $(PREFIX)/usr/share/man/man1/
	cp $(RESCACHED_CFG_MAN) $(PREFIX)/usr/share/man/man5/

	mkdir -p   $(PREFIX)/usr/share/rescached
	cp LICENSE $(PREFIX)/usr/share/rescached/

	mkdir -p                     $(PREFIX)/usr/lib/systemd/system
	cp scripts/rescached.service $(PREFIX)/usr/lib/systemd/system/

uninstall:
	rm -f $(PREFIX)/usr/share/rescached/LICENSE

	rm -f $(PREFIX)/usr/share/man/man5/$(RESCACHED_CFG_MAN)
	rm -f $(PREFIX)/usr/share/man/man1/$(RESOLVER_MAN)
	rm -f $(PREFIX)/usr/share/man/man1/$(RESCACHED_MAN)

	rm -f $(PREFIX)/usr/bin/rescached-update-hosts-block.sh
	rm -f $(PREFIX)/usr/bin/$(RESOLVER_BIN)
	rm -f $(PREFIX)/usr/bin/$(RESCACHED_BIN)
