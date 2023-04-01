// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

// Program rescached server that caching internet name and address on local
// memory for speeding up DNS resolution.
//
// Rescached primary goal is only to caching DNS queries and answers, used by
// personal or small group of users, to minimize unneeded traffic to outside
// network.
package main

import (
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
	"time"

	"git.sr.ht/~shulhan/ciigo"
	"github.com/shuLhan/share/lib/debug"
	"github.com/shuLhan/share/lib/memfs"
	"github.com/shuLhan/share/lib/telemetry"

	"github.com/shuLhan/rescached-go/v4"
)

const (
	cmdEmbed = "embed" // Command to generate embedded files.
	cmdDev   = "dev"   // Command to run rescached for local development.
)

func main() {
	var (
		env        *rescached.Environment
		rcd        *rescached.Server
		dirBase    string
		fileConfig string
		cmd        string
		running    chan bool
		qsignal    chan os.Signal
		err        error
	)

	log.SetFlags(0)
	log.SetPrefix("rescached: ")

	flag.StringVar(&dirBase, "dir-base", "", "Base directory for reading and storing rescached data.")
	flag.StringVar(&fileConfig, "config", "", "Path to configuration.")
	flag.Parse()

	env, err = rescached.LoadEnvironment(dirBase, fileConfig)
	if err != nil {
		log.Fatal(err)
	}

	cmd = strings.ToLower(flag.Arg(0))

	switch cmd {
	case cmdEmbed:
		err = env.HttpdOptions.Memfs.GoEmbed()
		if err != nil {
			log.Fatal(err)
		}
		return

	case cmdDev:
		running = make(chan bool)
		go watchWww(env, running)
		go watchWwwDoc()
	}

	rcd, err = rescached.New(env)
	if err != nil {
		log.Fatal(err)
	}

	err = rcd.Start()
	if err != nil {
		log.Fatal(err)
	}

	if debug.Value >= 4 {
		go debugRuntime()
	}

	var telemetryAgent *telemetry.Agent
	telemetryAgent, err = createTelemetryAgent(env.Telemetry)
	if err != nil {
		log.Print(err)
	}

	qsignal = make(chan os.Signal, 1)
	signal.Notify(qsignal, syscall.SIGQUIT, syscall.SIGSEGV, syscall.SIGTERM, syscall.SIGINT)
	<-qsignal
	if cmd == cmdDev {
		running <- false
		<-running
	}
	if telemetryAgent != nil {
		telemetryAgent.Stop()
	}
	rcd.Stop()
	os.Exit(0)
}

func debugRuntime() {
	ticker := time.NewTicker(30 * time.Second)
	memHeap := debug.NewMemHeap()

	for range ticker.C {
		debug.WriteHeapProfile("rescached", true)

		memHeap.Collect()

		fmt.Printf("=== rescached: MemHeap{RelHeapAlloc:%d RelHeapObjects:%d DiffHeapObjects:%d}\n",
			memHeap.RelHeapAlloc, memHeap.RelHeapObjects,
			memHeap.DiffHeapObjects)
	}
}

func createTelemetryAgent(telemetryOpt string) (agent *telemetry.Agent, err error) {
	if len(telemetryOpt) == 0 {
		return nil, nil
	}

	var (
		logp   = `createTelemetryAgent`
		ilpFmt = telemetry.NewIlpFormatter(`rescached`)

		forwarders []telemetry.Forwarder
		telUrl     *url.URL
	)

	telUrl, err = url.Parse(telemetryOpt)
	if err != nil {
		return nil, fmt.Errorf(`%s: %w`, logp, err)
	}

	var schemes = strings.SplitN(telUrl.Scheme, `+`, 2)

	switch schemes[0] {
	case `questdb`:
		telUrl.Scheme = schemes[1]

		var (
			qdbOpts = telemetry.QuestdbOptions{
				Fmt:       ilpFmt,
				ServerUrl: telUrl.String(),
			}

			qdbFwd *telemetry.QuestdbForwarder
		)

		qdbFwd, err = telemetry.NewQuestdbForwarder(qdbOpts)
		if err != nil {
			return nil, fmt.Errorf(`%s: %w`, logp, err)
		}

		log.Printf(`Starting telemetry using questdb: %s`, qdbOpts.ServerUrl)

		forwarders = append(forwarders, qdbFwd)

	default:
		return nil, fmt.Errorf(`%s: unknown forwarder %s`, logp, schemes[0])
	}

	// Create metadata.
	var md = telemetry.NewMetadata()
	md.Set(`version`, rescached.Version)

	var metricsCol telemetry.Collector
	metricsCol, err = createMetricsCollector()
	if err != nil {
		return nil, fmt.Errorf(`%s: %w`, logp, err)
	}

	// Create the Agent.
	var agentOpts = telemetry.AgentOptions{
		Metadata:   md,
		Forwarders: forwarders,
		Collectors: []telemetry.Collector{
			metricsCol,
		},
		Interval: 10 * time.Second,
	}

	agent = telemetry.NewAgent(agentOpts)
	return agent, nil
}

func createMetricsCollector() (col *telemetry.GoMetricsCollector, err error) {
	var metricsFilter *regexp.Regexp
	metricsFilter, err = regexp.Compile(`^go_(cpu|gc|memory|sched)_.*$`)
	if err != nil {
		return nil, err
	}
	col = telemetry.NewGoMetricsCollector(metricsFilter)
	return col, nil
}

// watchWww watch any changes to files inside _www directory and regenerate
// the embed file "memfs_generate.go".
func watchWww(env *rescached.Environment, running chan bool) {
	var (
		logp      = "watchWww"
		tick      = time.NewTicker(3 * time.Second)
		isRunning = true

		dw       *memfs.DirWatcher
		nChanges int
		err      error
	)

	dw, err = env.HttpdOptions.Memfs.Watch(memfs.WatchOptions{})
	if err != nil {
		log.Fatalf("%s: %s", logp, err)
	}

	for isRunning {
		select {
		case <-dw.C:
			nChanges++

		case <-tick.C:
			if nChanges == 0 {
				continue
			}

			fmt.Printf("--- %d changes\n", nChanges)
			err = env.HttpdOptions.Memfs.GoEmbed()
			if err != nil {
				log.Printf("%s", err)
			}
			nChanges = 0

		case <-running:
			isRunning = false
		}
	}

	// Run GoEmbed for the last time.
	if nChanges > 0 {
		fmt.Printf("--- %d changes\n", nChanges)
		err = env.HttpdOptions.Memfs.GoEmbed()
		if err != nil {
			log.Printf("%s", err)
		}
	}
	dw.Stop()
	running <- false
}

func watchWwwDoc() {
	var (
		logp        = "watchWwwDoc"
		convertOpts = ciigo.ConvertOptions{
			Root:         "_www/doc",
			HtmlTemplate: "_www/doc/html.tmpl",
		}

		err error
	)

	err = ciigo.Watch(&convertOpts)
	if err != nil {
		log.Fatalf("%s: %s", logp, err)
	}
}
