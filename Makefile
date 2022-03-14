## SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
## SPDX-License-Identifier: GPL-3.0-or-later

.PHONY: test test.prof lint build debug doc
.PHONY: install-common uninstall-common
.PHONY: install deploy uninstall
.PHONY: install-macos deploy-macos uninstall-macos
.PHONY: clean distclean
.PHONY: deploy-personal-server
.FORCE:

CGO_ENABLED:=$(shell go env CGO_ENABLED)
GOOS:=$(shell go env GOOS)
GOARCH:=$(shell go env GOARCH)

COVER_OUT:=cover.out
COVER_HTML:=cover.html
CPU_PROF:=cpu.prof
MEM_PROF:=mem.prof
DEBUG=

RESCACHED_BIN=_bin/$(GOOS)_$(GOARCH)/rescached
RESCACHED_MAN:=rescached.1.gz
RESCACHED_CFG:=cmd/rescached/rescached.cfg
RESCACHED_CFG_MAN:=_doc/rescached.cfg.5.gz

RESOLVER_BIN=_bin/$(GOOS)_$(GOARCH)/resolver
RESOLVER_MAN=_doc/resolver.1.gz

RESOLVERBENCH_BIN=_bin/$(GOOS)_$(GOARCH)/resolverbench

DIR_BIN=/usr/bin
DIR_MAN=/usr/share/man
DIR_RESCACHED=/usr/share/rescached

build: test memfs_generate.go
	mkdir -p _bin/$(GOOS)_$(GOARCH)
	CGO_ENABLED=$(CGO_ENABLED) GOOS=$(GOOS) GOARCH=$(GOARCH) \
		go build $(DEBUG) -o _bin/$(GOOS)_$(GOARCH)/ ./cmd/...

debug: CGO_ENABLED=1
debug: DEBUG=-race -v
debug: test build

test:
	go test $(DEBUG) -count=1 -coverprofile=$(COVER_OUT) ./...
	go tool cover -html=$(COVER_OUT) -o $(COVER_HTML)

test.prof:
	go test $(DEBUG) -count=1 \
		-cpuprofile $(CPU_PROF) \
		-memprofile $(MEM_PROF) ./...

lint:
	-golangci-lint run --enable-all ./...

memfs_generate.go: .FORCE
	go run ./cmd/rescached embed

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
	rm -f cmd/rescached/memfs.go
	rm -f testdata/rescached.pid
	rm -f $(COVER_OUT) $(COVER_HTML)
	rm -f $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)

##
## Development tasks
##

.PHONY: dev

dev:
	-sudo ./_bin/nft_dnstest_chain.sh; \
		go run ./cmd/rescached -config=cmd/rescached/rescached.cfg.test dev; \
		sudo ./_bin/nft_dnstest_chain.sh flush

##
## Common tasks for installing and uninstalling program.
##

install-common:
	mkdir -p $(PREFIX)/etc/rescached
	mkdir -p $(PREFIX)/etc/rescached/hosts.d
	mkdir -p $(PREFIX)/etc/rescached/zone.d
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
	cp COPYING $(PREFIX)$(DIR_RESCACHED)


uninstall-common:
	rm -f $(PREFIX)$(DIR_RESCACHED)/COPYING

	rm -f $(PREFIX)$(DIR_MAN)/man5/$(RESCACHED_CFG_MAN)
	rm -f $(PREFIX)$(DIR_MAN)/man1/$(RESOLVER_MAN)
	rm -f $(PREFIX)$(DIR_MAN)/man1/$(RESCACHED_MAN)

	rm -f $(PREFIX)$(DIR_BIN)/resolver
	rm -f $(PREFIX)$(DIR_BIN)/rescached

##
## Tasks for installing and uninstalling on GNU/Linux with systemd.
##

install: build install-common
	mkdir -p                      $(PREFIX)/usr/lib/systemd/system
	cp _scripts/rescached.service $(PREFIX)/usr/lib/systemd/system/

uninstall: uninstall-common
	systemctl stop rescached
	systemctl disable rescached
	rm -f /usr/lib/systemd/system/rescached.service

deploy: build
	sudo rsync _bin/$(GOOS)_$(GOARCH)/rescached $(DIR_BIN)/
	sudo rsync _bin/$(GOOS)_$(GOARCH)/resolver  $(DIR_BIN)/
	sudo systemctl restart rescached

##
## Tasks for installing and uninstalling service on macOS
##

install-macos: DIR_BIN=/usr/local/bin
install-macos: DIR_MAN=/usr/local/share/man
install-macos: DIR_RESCACHED=/usr/local/share/rescached
install-macos: build install-common
	cp _scripts/info.kilabit.rescached.plist /Library/LaunchDaemons/

deploy-macos: DIR_BIN=/usr/local/bin
deploy-macos: build
	sudo cp _bin/$(GOOS)_$(GOARCH)/rescached $(DIR_BIN)/
	sudo cp _bin/$(GOOS)_$(GOARCH)/resolver  $(DIR_BIN)/
	sudo launchctl stop info.kilabit.rescached

uninstall-macos: DIR_BIN=/usr/local/bin
uninstall-macos: DIR_MAN=/usr/local/share/man
uninstall-macos: DIR_RESCACHED=/usr/local/share/rescached
uninstall-macos: uninstall-common
	launchctl stop info.kilabit.rescached
	launchctl unload info.kilabit.rescached
	rm -f /Library/LaunchDaemons/info.kilabit.rescached.plist

##
## Tasks for deploying to public DNS server.
##

build-linux-amd64: CGO_ENABLED=0
build-linux-amd64: GOOS=linux
build-linux-amd64: GOARCH=amd64
build-linux-amd64: build

deploy-personal-server: build-linux-amd64
	rsync --progress _bin/linux_amd64/rescached personal-server:~/bin/rescached
	ssh personal-server "sudo rsync ~/bin/rescached /usr/bin/rescached; sudo systemctl restart rescached.service"
