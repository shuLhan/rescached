## SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
## SPDX-License-Identifier: GPL-3.0-or-later

.FORCE:

CGO_ENABLED:=$(shell go env CGO_ENABLED)
GOOS:=$(shell go env GOOS)
GOARCH:=$(shell go env GOARCH)
VERSION=$(shell git describe --long | sed 's/\([^-]*-g\)/r\1/;s/-/./g')

COVER_OUT:=cover.out
COVER_HTML:=cover.html
CPU_PROF:=cpu.prof
MEM_PROF:=mem.prof
DEBUG=
LD_FLAGS=

RESCACHED_BIN=_bin/$(GOOS)_$(GOARCH)/rescached
RESOLVER_BIN=_bin/$(GOOS)_$(GOARCH)/resolver
RESOLVERBENCH_BIN=_bin/$(GOOS)_$(GOARCH)/resolverbench

RESCACHED_MAN:=_sys/usr/share/man/man1/rescached.1.gz
RESCACHED_CFG_MAN:=_sys/usr/share/man/man5/rescached.cfg.5.gz
RESOLVER_MAN:=_sys/usr/share/man/man1/resolver.1.gz

DIR_BIN=/usr/bin
DIR_MAN=/usr/share/man
DIR_RESCACHED=/usr/share/rescached

##---- Tasks for testing, linting, and building program.

.PHONY: test test.prof lint debug build resolver rescached

build: lint test resolver rescached

## Build with race detection.

debug: CGO_ENABLED=1
debug: DEBUG=-race -v
debug: test build


resolver: LD_FLAGS =-X 'main.Usage=$$(go tool doc ./cmd/resolver)'
resolver: LD_FLAGS+=-X 'github.com/shuLhan/rescached-go/v4.Version=${VERSION}'
resolver:
	mkdir -p _bin/$(GOOS)_$(GOARCH)
	go build $(DEBUG) -ldflags="$(LD_FLAGS)" -o _bin/$(GOOS)_$(GOARCH)/ ./cmd/resolver

rescached:
	mkdir -p _bin/$(GOOS)_$(GOARCH)
	go run ./cmd/rescached embed
	go build $(DEBUG) -ldflags="$(LD_FLAGS)" -o _bin/$(GOOS)_$(GOARCH)/ ./cmd/rescached


test:
	go test $(DEBUG) -count=1 -coverprofile=$(COVER_OUT) ./...
	go tool cover -html=$(COVER_OUT) -o $(COVER_HTML)

test.prof:
	go test $(DEBUG) -count=1 \
		-cpuprofile $(CPU_PROF) \
		-memprofile $(MEM_PROF) ./...

lint:
	-golangci-lint run ./...
	-reuse lint


##---- Cleaning up.

.PHONY: clean distclean

distclean: clean
	go clean -i ./...

clean:
	rm -f cmd/rescached/memfs.go
	rm -f testdata/rescached.pid
	rm -f $(COVER_OUT) $(COVER_HTML)
	rm -f $(RESCACHED_BIN) $(RESOLVER_BIN) $(RESOLVERBENCH_BIN)


##---- Documentation tasks.

.PHONY: doc

doc: $(RESCACHED_MAN) $(RESCACHED_CFG_MAN) $(RESOLVER_MAN)

$(RESCACHED_MAN): README.adoc
	asciidoctor --backend=manpage --destination-dir=_sys/usr/share/man/man1/ $<
	gzip -f _sys/usr/share/man/man1/rescached.1

$(RESCACHED_CFG_MAN): _www/doc/rescached.cfg.adoc
	asciidoctor --backend=manpage --destination-dir=_sys/usr/share/man/man5/ $<
	gzip -f _sys/usr/share/man/man5/rescached.cfg.5

$(RESOLVER_MAN): _www/doc/resolver.adoc
	asciidoctor --backend=manpage --destination-dir=_sys/usr/share/man/man1/ $<
	gzip -f _sys/usr/share/man/man1/resolver.1


##---- Development tasks

.PHONY: dev

dev:
	go run ./cmd/rescached -dir-base=./_test -config=etc/rescached/rescached.cfg dev


##---- Common tasks for installing and uninstalling program.

.PHONY: install-common uninstall-common

install-common:
	mkdir -p $(PREFIX)/etc/rescached
	mkdir -p $(PREFIX)/etc/rescached/hosts.d
	mkdir -p $(PREFIX)/etc/rescached/zone.d

	cp -f _sys/etc/rescached/rescached.cfg      $(PREFIX)/etc/rescached/
	cp -f _sys/etc/rescached/localhost.pem      $(PREFIX)/etc/rescached/
	cp -f _sys/etc/rescached/localhost.pem.key  $(PREFIX)/etc/rescached/

	mkdir -p $(PREFIX)/etc/rescached/block.d
	cp -f _sys/etc/rescached/block.d/.pgl.yoyo.org         $(PREFIX)/etc/rescached/block.d/
	cp -f _sys/etc/rescached/block.d/.someonewhocares.org  $(PREFIX)/etc/rescached/block.d/
	cp -f _sys/etc/rescached/block.d/.winhelp2002.mvps.org $(PREFIX)/etc/rescached/block.d/

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


##---- Tasks for installing and uninstalling on GNU/Linux with systemd.

.PHONY: install deploy uninstall

install: build install-common
	mkdir -p $(PREFIX)/usr/lib/systemd/system
	cp _sys/usr/lib/systemd/system/rescached.service $(PREFIX)/usr/lib/systemd/system/

uninstall: uninstall-common
	systemctl stop rescached
	systemctl disable rescached
	rm -f /usr/lib/systemd/system/rescached.service

deploy: build
	sudo rsync _bin/$(GOOS)_$(GOARCH)/rescached $(DIR_BIN)/
	sudo rsync _bin/$(GOOS)_$(GOARCH)/resolver  $(DIR_BIN)/
	sudo systemctl restart rescached


##---- Tasks for installing and uninstalling service on macOS.

.PHONY: install-macos deploy-macos uninstall-macos

install-macos: DIR_BIN=/usr/local/bin
install-macos: DIR_MAN=/usr/local/share/man
install-macos: DIR_RESCACHED=/usr/local/share/rescached
install-macos: build install-common
	cp _sys/Library/LaunchDaemons/info.kilabit.rescached.plist /Library/LaunchDaemons/

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


##---- Tasks for deploying to public DNS server.

.PHONY: deploy-personal-server

build-linux-amd64: CGO_ENABLED=0
build-linux-amd64: GOOS=linux
build-linux-amd64: GOARCH=amd64
build-linux-amd64: build

deploy-personal-server: build-linux-amd64
	rsync --progress _bin/linux_amd64/rescached personal-server:~/bin/rescached
	ssh personal-server "sudo rsync ~/bin/rescached /usr/bin/rescached; sudo systemctl restart rescached.service"
