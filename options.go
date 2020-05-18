// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"io/ioutil"
	"log"
	"strconv"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	"github.com/shuLhan/share/lib/ini"
	libnet "github.com/shuLhan/share/lib/net"
	libstrings "github.com/shuLhan/share/lib/strings"
)

const (
	defWuiAddress = "127.0.0.1:5380"
)

const (
	sectionNameDNS       = "dns"
	sectionNameRescached = "rescached"

	subNameServer = "server"

	keyDebug          = "debug"
	keyFileResolvConf = "file.resolvconf"

	keyCachePruneDelay     = "cache.prune_delay"
	keyCachePruneThreshold = "cache.prune_threshold"
	keyDohBehindProxy      = "doh.behind_proxy"
	keyHTTPPort            = "http.port"
	keyListen              = "listen"
	keyParent              = "parent"
	keyTLSAllowInsecure    = "tls.allow_insecure"
	keyTLSCertificate      = "tls.certificate"
	keyTLSPort             = "tls.port"
	keyTLSPrivateKey       = "tls.private_key"
)

//
// Options for running rescached.
//
type Options struct {
	dns.ServerOptions
	WuiListen      string `ini:"rescached::wui.listen"`
	DirHosts       string `ini:"rescached::dir.hosts"`
	DirMaster      string `ini:"rescached::dir.master"`
	FileResolvConf string `ini:"rescached::file.resolvconf"`
	Debug          int    `ini:"rescached::debug"`
}

func loadOptions(file string) (opts *Options) {
	opts = NewOptions()

	if len(file) == 0 {
		opts.init()
		return opts
	}

	cfg, err := ioutil.ReadFile(file)
	if err != nil {
		log.Printf("rescached: loadOptions %q: %s", file, err)
		return opts
	}

	err = ini.Unmarshal(cfg, opts)
	if err != nil {
		log.Printf("rescached: loadOptions %q: %s", file, err)
		return opts
	}

	opts.init()
	debug.Value = opts.Debug

	return opts
}

//
// NewOptions create and initialize options with default values.
//
func NewOptions() *Options {
	return &Options{
		ServerOptions: dns.ServerOptions{
			ListenAddress: "127.0.0.1:53",
		},
	}
}

//
// init check and initialize the Options instance with default values.
//
func (opts *Options) init() {
	if len(opts.WuiListen) == 0 {
		opts.WuiListen = defWuiAddress
	}
	if len(opts.ListenAddress) == 0 {
		opts.ListenAddress = "127.0.0.1:53"
	}
	if len(opts.FileResolvConf) > 0 {
		_, _ = opts.loadResolvConf()
	}
}

func (opts *Options) loadResolvConf() (ok bool, err error) {
	rc, err := libnet.NewResolvConf(opts.FileResolvConf)
	if err != nil {
		return false, err
	}

	if debug.Value > 0 {
		fmt.Printf("rescached: loadResolvConf: %+v\n", rc)
	}

	if len(rc.NameServers) == 0 {
		return false, nil
	}

	for x := 0; x < len(rc.NameServers); x++ {
		rc.NameServers[x] = "udp://" + rc.NameServers[x]
	}

	if libstrings.IsEqual(opts.NameServers, rc.NameServers) {
		return false, nil
	}

	if len(opts.NameServers) == 0 {
		opts.NameServers = rc.NameServers
	} else {
		opts.FallbackNS = rc.NameServers
	}

	return true, nil
}

//
// write the options values back to file.
//
func (opts *Options) write(file string) (err error) {
	in, err := ini.Open(file)
	if err != nil {
		return fmt.Errorf("write: %w", err)
	}

	in.Set(sectionNameRescached, "", keyFileResolvConf, opts.FileResolvConf)
	in.Set(sectionNameRescached, "", keyDebug, strconv.Itoa(opts.Debug))

	in.UnsetAll(sectionNameDNS, subNameServer, keyParent)
	for _, ns := range opts.NameServers {
		in.Add(sectionNameDNS, subNameServer, keyParent, ns)
	}

	in.Set(sectionNameDNS, subNameServer, keyListen,
		opts.ServerOptions.ListenAddress)

	in.Set(sectionNameDNS, subNameServer, keyHTTPPort,
		strconv.Itoa(int(opts.ServerOptions.HTTPPort)))

	in.Set(sectionNameDNS, subNameServer, keyTLSPort,
		strconv.Itoa(int(opts.ServerOptions.TLSPort)))
	in.Set(sectionNameDNS, subNameServer, keyTLSCertificate,
		opts.ServerOptions.TLSCertFile)
	in.Set(sectionNameDNS, subNameServer, keyTLSPrivateKey,
		opts.ServerOptions.TLSPrivateKey)
	in.Set(sectionNameDNS, subNameServer, keyTLSAllowInsecure,
		fmt.Sprintf("%t", opts.ServerOptions.TLSAllowInsecure))
	in.Set(sectionNameDNS, subNameServer, keyDohBehindProxy,
		fmt.Sprintf("%t", opts.ServerOptions.DoHBehindProxy))

	in.Set(sectionNameDNS, subNameServer, keyCachePruneDelay,
		fmt.Sprintf("%s", opts.ServerOptions.PruneDelay))
	in.Set(sectionNameDNS, subNameServer, keyCachePruneThreshold,
		fmt.Sprintf("%s", opts.ServerOptions.PruneThreshold))

	return in.Save(file)
}
