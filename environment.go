// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/dns"
	libhttp "github.com/shuLhan/share/lib/http"
	"github.com/shuLhan/share/lib/ini"
	"github.com/shuLhan/share/lib/memfs"
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

	dirHosts = "/etc/rescached/hosts.d"
	dirZone  = "/etc/rescached/zone.d"
)

var (
	mfsWww *memfs.MemFS
)

//
// Environment for running rescached.
//
type Environment struct {
	HostsFiles map[string]*dns.HostsFile
	Zones      map[string]*dns.Zone

	fileConfig     string
	FileResolvConf string `ini:"rescached::file.resolvconf"`
	WUIListen      string `ini:"rescached::wui.listen"`

	HostsBlocksRaw []string `ini:"rescached::hosts_block" json:"-"`
	HostsBlocks    []*hostsBlock

	// The options for WUI HTTP server.
	HttpdOptions *libhttp.ServerOptions `json:"-"`

	dns.ServerOptions

	Debug int `ini:"rescached::debug"`
}

//
// LoadEnvironment initialize environment from configuration file.
//
func LoadEnvironment(fileConfig string) (env *Environment, err error) {
	var (
		logp = "LoadEnvironment"
		cfg  *ini.Ini
	)

	env = newEnvironment()
	env.fileConfig = fileConfig

	if len(fileConfig) == 0 {
		env.init()
		return env, nil
	}

	cfg, err = ini.Open(fileConfig)
	if err != nil {
		return nil, fmt.Errorf("%s: %q: %s", logp, fileConfig, err)
	}

	err = cfg.Unmarshal(env)
	if err != nil {
		return nil, fmt.Errorf("%s: %q: %s", logp, fileConfig, err)
	}

	return env, nil
}

//
// newEnvironment create and initialize options with default values.
//
func newEnvironment() *Environment {
	return &Environment{
		HttpdOptions: &libhttp.ServerOptions{
			Memfs:   mfsWww,
			Address: defWuiAddress,
		},
		ServerOptions: dns.ServerOptions{
			ListenAddress: "127.0.0.1:53",
		},
	}
}

//
// init check and initialize the environment instance with default values.
//
func (env *Environment) init() (err error) {
	if len(env.WUIListen) == 0 {
		env.WUIListen = defWuiAddress
	}
	if len(env.ListenAddress) == 0 {
		env.ListenAddress = "127.0.0.1:53"
	}
	if len(env.FileResolvConf) > 0 {
		_, _ = env.loadResolvConf()
	}

	debug.Value = env.Debug

	if env.HttpdOptions == nil {
		env.HttpdOptions = &libhttp.ServerOptions{
			Memfs:   mfsWww,
			Address: env.WUIListen,
		}
	} else {
		env.HttpdOptions.Address = env.WUIListen
	}

	if env.HttpdOptions.Memfs == nil {
		memfsWwwOpts := &memfs.Options{
			Root: defHTTPDRootDir,
			Includes: []string{
				`.*\.css$`,
				`.*\.html$`,
				`.*\.js$`,
				`.*\.png$`,
			},
			Embed: memfs.EmbedOptions{
				CommentHeader: `// SPDX-FileCopyrightText: 2021 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later
`,
				PackageName: "rescached",
				VarName:     "mfsWww",
				GoFileName:  "memfs_generate.go",
			},
		}
		env.HttpdOptions.Memfs, err = memfs.New(memfsWwwOpts)
		if err != nil {
			return fmt.Errorf("Environment.init: %w", err)
		}
	}

	return nil
}

func (env *Environment) initHostsBlock() {
	env.HostsBlocks = hostsBlockSources

	for x, v := range env.HostsBlocksRaw {
		env.HostsBlocksRaw[x] = strings.ToLower(v)
	}

	for _, hb := range env.HostsBlocks {
		hb.init(env.HostsBlocksRaw)
	}
}

func (env *Environment) loadResolvConf() (ok bool, err error) {
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
	}

	return true, nil
}

//
// write the options values back to file.
//
func (env *Environment) write(file string) (err error) {
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
