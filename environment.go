// Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package rescached

import (
	"fmt"
	"log"
	"strconv"
	"strings"

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
	keyHostsBlock          = "hosts_block"
	keyHTTPPort            = "http.port"
	keyIsEnabled           = "is_enabled"
	keyIsSystem            = "is_system"
	keyLastUpdated         = "last_updated"
	keyListen              = "listen"
	keyParent              = "parent"
	keyWUIListen           = "wui.listen"
	keyTLSAllowInsecure    = "tls.allow_insecure"
	keyTLSCertificate      = "tls.certificate"
	keyTLSPort             = "tls.port"
	keyTLSPrivateKey       = "tls.private_key"

	dirHosts  = "/etc/rescached/hosts.d"
	dirMaster = "/etc/rescached/master.d"
)

//
// environment for running rescached.
//
type environment struct {
	dns.ServerOptions
	WUIListen      string   `ini:"rescached::wui.listen"`
	FileResolvConf string   `ini:"rescached::file.resolvconf"`
	Debug          int      `ini:"rescached::debug"`
	HostsBlocksRaw []string `ini:"rescached::hosts_block" json:"-"`
	HostsBlocks    []*hostsBlock
	HostsFiles     []*hostsFile
	ZoneFiles      map[string]*dns.ZoneFile
}

func loadEnvironment(file string) (env *environment) {
	env = newEnvironment()

	if len(file) == 0 {
		env.init()
		return env
	}

	cfg, err := ini.Open(file)
	if err != nil {
		log.Printf("loadEnvironment %q: %s", file, err)
		return env
	}

	err = cfg.Unmarshal(env)
	if err != nil {
		log.Printf("loadEnvironment %q: %s", file, err)
		return env
	}

	env.init()
	env.initHostsBlock(cfg)
	debug.Value = env.Debug

	return env
}

//
// newEnvironment create and initialize options with default values.
//
func newEnvironment() *environment {
	return &environment{
		ServerOptions: dns.ServerOptions{
			ListenAddress: "127.0.0.1:53",
		},
	}
}

//
// init check and initialize the environment instance with default values.
//
func (env *environment) init() {
	if len(env.WUIListen) == 0 {
		env.WUIListen = defWuiAddress
	}
	if len(env.ListenAddress) == 0 {
		env.ListenAddress = "127.0.0.1:53"
	}
	if len(env.FileResolvConf) > 0 {
		_, _ = env.loadResolvConf()
	}
}

func (env *environment) initHostsBlock(cfg *ini.Ini) {
	env.HostsBlocks = hostsBlockSources

	for x, v := range env.HostsBlocksRaw {
		env.HostsBlocksRaw[x] = strings.ToLower(v)
	}

	for _, hb := range env.HostsBlocks {
		hb.init(env.HostsBlocksRaw)
	}
}

func (env *environment) loadResolvConf() (ok bool, err error) {
	rc, err := libnet.NewResolvConf(env.FileResolvConf)
	if err != nil {
		return false, err
	}

	if debug.Value > 0 {
		fmt.Printf("loadResolvConf: %+v\n", rc)
	}

	if len(rc.NameServers) == 0 {
		return false, nil
	}

	for x := 0; x < len(rc.NameServers); x++ {
		rc.NameServers[x] = "udp://" + rc.NameServers[x]
	}

	if libstrings.IsEqual(env.NameServers, rc.NameServers) {
		return false, nil
	}

	if len(env.NameServers) == 0 {
		env.NameServers = rc.NameServers
	} else {
		env.FallbackNS = rc.NameServers
	}

	return true, nil
}

//
// write the options values back to file.
//
func (env *environment) write(file string) (err error) {
	in, err := ini.Open(file)
	if err != nil {
		return fmt.Errorf("write: %w", err)
	}

	in.Set(sectionNameRescached, "", keyFileResolvConf, env.FileResolvConf)
	in.Set(sectionNameRescached, "", keyDebug, strconv.Itoa(env.Debug))
	in.Set(sectionNameRescached, "", keyWUIListen, strings.TrimSpace(env.WUIListen))

	in.UnsetAll(sectionNameRescached, "", keyHostsBlock)

	for _, hb := range env.HostsBlocks {
		if hb.IsEnabled {
			in.Add(sectionNameRescached, "", keyHostsBlock, hb.URL)
		}
	}

	in.UnsetAll(sectionNameDNS, subNameServer, keyParent)
	for _, ns := range env.NameServers {
		in.Add(sectionNameDNS, subNameServer, keyParent, ns)
	}

	in.Set(sectionNameDNS, subNameServer, keyListen,
		env.ServerOptions.ListenAddress)

	in.Set(sectionNameDNS, subNameServer, keyHTTPPort,
		strconv.Itoa(int(env.ServerOptions.HTTPPort)))

	in.Set(sectionNameDNS, subNameServer, keyTLSPort,
		strconv.Itoa(int(env.ServerOptions.TLSPort)))
	in.Set(sectionNameDNS, subNameServer, keyTLSCertificate,
		env.ServerOptions.TLSCertFile)
	in.Set(sectionNameDNS, subNameServer, keyTLSPrivateKey,
		env.ServerOptions.TLSPrivateKey)
	in.Set(sectionNameDNS, subNameServer, keyTLSAllowInsecure,
		fmt.Sprintf("%t", env.ServerOptions.TLSAllowInsecure))
	in.Set(sectionNameDNS, subNameServer, keyDohBehindProxy,
		fmt.Sprintf("%t", env.ServerOptions.DoHBehindProxy))

	in.Set(sectionNameDNS, subNameServer, keyCachePruneDelay,
		fmt.Sprintf("%s", env.ServerOptions.PruneDelay))
	in.Set(sectionNameDNS, subNameServer, keyCachePruneThreshold,
		fmt.Sprintf("%s", env.ServerOptions.PruneThreshold))

	return in.Save(file)
}
