// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package rescached

import (
	"fmt"
	"io"
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
	sectionNameBlockd    = "block.d"
	sectionNameDNS       = "dns"
	sectionNameRescached = "rescached"

	subNameServer = "server"

	keyDebug          = "debug"
	keyFileResolvConf = "file.resolvconf"
	keyName           = "name"
	keyUrl            = "url"

	keyCachePruneDelay     = "cache.prune_delay"
	keyCachePruneThreshold = "cache.prune_threshold"
	keyDohBehindProxy      = "doh.behind_proxy"
	keyHTTPPort            = "http.port"
	keyListen              = "listen"
	keyParent              = "parent"
	keyWUIListen           = "wui.listen"
	keyTLSAllowInsecure    = "tls.allow_insecure"
	keyTLSCertificate      = "tls.certificate"
	keyTLSPort             = "tls.port"
	keyTLSPrivateKey       = "tls.private_key"

	dirBlock = "/etc/rescached/block.d"
	dirHosts = "/etc/rescached/hosts.d"
	dirZone  = "/etc/rescached/zone.d"
)

var (
	mfsWww *memfs.MemFS
)

// Environment for running rescached.
type Environment struct {
	HostsFiles map[string]*dns.HostsFile
	Zones      map[string]*dns.Zone

	fileConfig     string
	FileResolvConf string `ini:"rescached::file.resolvconf"`
	WUIListen      string `ini:"rescached::wui.listen"`

	HostsBlocks     map[string]*hostsBlock `ini:"block.d"`
	hostsBlocksFile map[string]*dns.HostsFile

	// The options for WUI HTTP server.
	HttpdOptions *libhttp.ServerOptions `json:"-"`

	dns.ServerOptions

	Debug int `ini:"rescached::debug"`
}

// LoadEnvironment initialize environment from configuration file.
func LoadEnvironment(fileConfig string) (env *Environment, err error) {
	var (
		logp = "LoadEnvironment"
		cfg  *ini.Ini
	)

	env = newEnvironment()
	env.fileConfig = fileConfig

	if len(fileConfig) == 0 {
		_ = env.init()
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

// newEnvironment create and initialize options with default values.
func newEnvironment() *Environment {
	return &Environment{
		hostsBlocksFile: make(map[string]*dns.HostsFile),
		HttpdOptions: &libhttp.ServerOptions{
			Memfs:   mfsWww,
			Address: defWuiAddress,
		},
		ServerOptions: dns.ServerOptions{
			ListenAddress: "127.0.0.1:53",
		},
	}
}

// init check and initialize the environment instance with default values.
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
	var (
		dirBase = ""

		hb *hostsBlock
	)
	for _, hb = range env.HostsBlocks {
		hb.init(dirBase)
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

func (env *Environment) save(file string) (in *ini.Ini, err error) {
	var (
		logp = "save"

		hb   *hostsBlock
		vstr string
	)

	if len(file) == 0 {
		in = &ini.Ini{}
	} else {
		in, err = ini.Open(file)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", logp, err)
		}
	}

	in.Set(sectionNameRescached, "", keyFileResolvConf, env.FileResolvConf)
	in.Set(sectionNameRescached, "", keyDebug, strconv.Itoa(env.Debug))
	in.Set(sectionNameRescached, "", keyWUIListen, strings.TrimSpace(env.WUIListen))

	for _, hb = range env.HostsBlocks {
		in.Set(sectionNameBlockd, hb.Name, keyName, hb.Name)
		in.Set(sectionNameBlockd, hb.Name, keyUrl, hb.URL)
	}

	in.UnsetAll(sectionNameDNS, subNameServer, keyParent)
	for _, vstr = range env.NameServers {
		in.Add(sectionNameDNS, subNameServer, keyParent, vstr)
	}

	in.Set(sectionNameDNS, subNameServer, keyListen, env.ListenAddress)

	in.Set(sectionNameDNS, subNameServer, keyHTTPPort, strconv.Itoa(int(env.HTTPPort)))

	in.Set(sectionNameDNS, subNameServer, keyTLSPort, strconv.Itoa(int(env.TLSPort)))
	in.Set(sectionNameDNS, subNameServer, keyTLSCertificate, env.TLSCertFile)
	in.Set(sectionNameDNS, subNameServer, keyTLSPrivateKey, env.TLSPrivateKey)
	in.Set(sectionNameDNS, subNameServer, keyTLSAllowInsecure, fmt.Sprintf("%t", env.TLSAllowInsecure))
	in.Set(sectionNameDNS, subNameServer, keyDohBehindProxy, fmt.Sprintf("%t", env.DoHBehindProxy))

	in.Set(sectionNameDNS, subNameServer, keyCachePruneDelay, env.PruneDelay.String())
	in.Set(sectionNameDNS, subNameServer, keyCachePruneThreshold, env.PruneThreshold.String())

	return in, nil
}

// Write the configuration as ini format to Writer w.
func (env *Environment) Write(w io.Writer) (err error) {
	if w == nil {
		return nil
	}

	var (
		logp = "Environment.Write"
		outb []byte
	)

	outb, err = ini.Marshal(env)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	_, err = w.Write(outb)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	return nil
}

// write the options values back to file.
func (env *Environment) write(file string) (err error) {
	var (
		in *ini.Ini
	)
	in, err = env.save(file)
	if err != nil {
		return err
	}
	if len(file) > 0 {
		return in.Save(file)
	}
	return nil
}
