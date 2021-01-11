## Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
## Use of this source code is governed by a BSD-style
## license that can be found in the LICENSE file.

.PHONY: build debug install install-common install-macos
.PHONY: uninstall uninstall-macos
.PHONY: test test.prof lint
.PHONY: doc
.PHONY: clean distclean
.PHONY: deploy

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
RESCACHED_CFG_MAN:=_doc/rescached.cfg.5.gz

RESOLVER_BIN:=resolver
RESOLVER_MAN:=_doc/resolver.1.gz

RESOLVERBENCH_BIN:=resolverbench

DIR_BIN=/usr/bin
DIR_MAN=/usr/share/man
DIR_RESCACHED=/usr/share/rescached

build: test $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)

debug: DEBUG=-race -v
debug: test $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)

test: $(COVER_HTML)

test.prof:
	go test $(DEBUG) -count=1 \
		-cpuprofile $(CPU_PROF) \
		-memprofile $(MEM_PROF) ./...

$(COVER_HTML): $(COVER_OUT)
	go tool cover -html=$< -o $@

$(COVER_OUT): $(SRC) $(SRC_TEST)
	go test $(DEBUG) -count=1 -coverprofile=$@ ./...

lint:
	-golangci-lint run --enable-all ./...

$(RESCACHED_BIN): memfs_generate.go $(SRC)
	go build $(DEBUG) ./cmd/rescached

memfs_generate.go: internal/generate_memfs.go _www/public/build/*
	go run ./internal/generate_memfs.go

$(RESOLVER_BIN): $(SRC)
	go build $(DEBUG) ./cmd/resolver

$(RESOLVERBENCH_BIN): $(SRC)
	go build $(DEBUG) ./cmd/resolverbench

doc: $(RESCACHED_MAN) $(RESCACHED_CFG_MAN) $(RESOLVER_MAN)

$(RESCACHED_MAN): README.adoc
	asciidoctor --backend manpage $<
	gzip -f rescached.1

$(RESCACHED_CFG_MAN): _doc/rescached.cfg.adoc
	asciidoctor --backend manpage $<
	gzip -f _doc/rescached.cfg.5

$(RESOLVER_MAN): _doc/resolver.adoc
	asciidoctor --backend manpage $<
	gzip -f _doc/resolver.1

distclean: clean
	go clean -i ./...

clean:
	rm -f testdata/rescached.pid
	rm -f $(COVER_OUT) $(COVER_HTML)
	rm -f $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)


install-common:
	mkdir -p $(PREFIX)/etc/rescached
	mkdir -p $(PREFIX)/etc/rescached/hosts.d
	mkdir -p $(PREFIX)/etc/rescached/master.d
	cp $(RESCACHED_CFG)            $(PREFIX)/etc/rescached/
	cp testdata/localhost.cert.pem $(PREFIX)/etc/rescached/
	cp testdata/localhost.key.pem  $(PREFIX)/etc/rescached/

	mkdir -p               $(PREFIX)$(DIR_BIN)
	cp -f $(RESCACHED_BIN) $(PREFIX)$(DIR_BIN)
	cp -f $(RESOLVER_BIN)  $(PREFIX)$(DIR_BIN)

	mkdir -p                $(PREFIX)$(DIR_MAN)/man1
	mkdir -p                $(PREFIX)$(DIR_MAN)/man5
	cp $(RESCACHED_MAN)     $(PREFIX)$(DIR_MAN)/man1/
	cp $(RESOLVER_MAN)      $(PREFIX)$(DIR_MAN)/man1/
	cp $(RESCACHED_CFG_MAN) $(PREFIX)$(DIR_MAN)/man5/

	mkdir -p   $(PREFIX)$(DIR_RESCACHED)
	cp LICENSE $(PREFIX)$(DIR_RESCACHED)


install: build install-common
	mkdir -p                      $(PREFIX)/usr/lib/systemd/system
	cp _scripts/rescached.service $(PREFIX)/usr/lib/systemd/system/


install-macos: DIR_BIN=/usr/local/bin
install-macos: DIR_MAN=/usr/local/share/man
install-macos: DIR_RESCACHED=/usr/local/share/rescached
install-macos: build install-common
	cp _scripts/info.kilabit.rescached.plist /Library/LaunchDaemons/


uninstall-common:
	rm -f $(PREFIX)$(DIR_RESCACHED)/LICENSE

	rm -f $(PREFIX)$(DIR_MAN)/man5/$(RESCACHED_CFG_MAN)
	rm -f $(PREFIX)$(DIR_MAN)/man1/$(RESOLVER_MAN)
	rm -f $(PREFIX)$(DIR_MAN)/man1/$(RESCACHED_MAN)

	rm -f $(PREFIX)$(DIR_BIN)/$(RESOLVER_BIN)
	rm -f $(PREFIX)$(DIR_BIN)/$(RESCACHED_BIN)


uninstall: uninstall-common
	systemctl stop rescached
	systemctl disable rescached
	rm -f /usr/lib/systemd/system/rescached.service


uninstall-macos: DIR_BIN=/usr/local/bin
uninstall-macos: DIR_MAN=/usr/local/share/man
uninstall-macos: DIR_RESCACHED=/usr/local/share/rescached
uninstall-macos: uninstall-common
	launchctl stop info.kilabit.rescached
	launchctl unload info.kilabit.rescached
	rm -f /Library/LaunchDaemons/info.kilabit.rescached.plist

deploy:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build ./cmd/rescached
	rsync --progress ./rescached dns-server:~/bin/rescached
