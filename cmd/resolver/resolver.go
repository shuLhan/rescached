// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/big"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/shuLhan/rescached-go/v4"
	"github.com/shuLhan/share/lib/dns"
	libnet "github.com/shuLhan/share/lib/net"
)

const (
	defAttempts     = 1
	defQueryType    = "A"
	defQueryClass   = "IN"
	defRescachedURL = `http://127.0.0.1:5380`
	defResolvConf   = "/etc/resolv.conf"
	defTimeout      = 5 * time.Second
)

type resolver struct {
	conf *libnet.ResolvConf
	dnsc dns.Client

	cmd     string
	qname   string
	sqtype  string
	sqclass string

	nameserver   string
	rescachedURL string

	qtype  dns.RecordType
	qclass dns.RecordClass

	insecure bool
}

func (rsol *resolver) doCmdBlockd(args []string) {
	var (
		resc = rsol.newRescachedClient()

		hostBlockd map[string]*rescached.Blockd
		blockd     *rescached.Blockd
		vbytes     []byte
		subCmd     string
		err        error
	)

	if len(args) > 0 {
		subCmd = strings.ToLower(args[0])
	}

	switch subCmd {
	case "":
		hostBlockd, err = resc.Blockd()
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		vbytes, err = json.MarshalIndent(hostBlockd, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		fmt.Println(string(vbytes))

	case subCmdDisable:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
		}

		blockd, err = resc.BlockdDisable(args[0])
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		vbytes, err = json.MarshalIndent(blockd, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		fmt.Println(string(vbytes))

	case subCmdEnable:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
		}

		blockd, err = resc.BlockdEnable(args[0])
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		vbytes, err = json.MarshalIndent(blockd, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		fmt.Println(string(vbytes))

	case subCmdUpdate:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
		}

		blockd, err = resc.BlockdFetch(args[0])
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		vbytes, err = json.MarshalIndent(blockd, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s %s: %s", rsol.cmd, subCmd, err)
		}

		fmt.Println(string(vbytes))

	default:
		log.Fatalf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
	}
}

// doCmdCaches call the rescached HTTP API to fetch all caches.
func (rsol *resolver) doCmdCaches(args []string) {
	var (
		resc = rsol.newRescachedClient()

		subCmd  string
		answers []*dns.Answer
		listMsg []*dns.Message
		err     error
	)

	if len(args) == 0 {
		answers, err = resc.Caches()
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		fmt.Printf("Total caches: %d\n", len(answers))
		printAnswers(answers)
		return
	}

	subCmd = strings.ToLower(args[0])
	switch subCmd {
	case subCmdRemove:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
		}

		answers, err = resc.CachesRemove(args[0])
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		fmt.Printf("Total answer removed: %d\n", len(answers))
		printAnswers(answers)

	case subCmdSearch:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing argument", rsol.cmd, subCmd)
		}

		listMsg, err = resc.CachesSearch(args[0])
		if err != nil {
			log.Fatalf("resolver: caches: %s", err)
		}

		fmt.Printf("Total search: %d\n", len(listMsg))
		printMessages(listMsg)

	default:
		log.Fatalf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
	}
}

func (rsol *resolver) doCmdEnv(args []string) {
	var (
		resc = rsol.newRescachedClient()

		err error
	)

	if len(args) == 0 {
		var env *rescached.Environment

		env, err = resc.Env()
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		var envJSON []byte

		envJSON, err = json.MarshalIndent(env, ``, `  `)
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		fmt.Println(string(envJSON))
		return
	}

	var subCmd = strings.ToLower(args[0])
	switch subCmd {
	case subCmdUpdate:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing file argument", rsol.cmd, subCmd)
		}

		err = rsol.doCmdEnvUpdate(resc, args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

	default:
		log.Printf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
		os.Exit(2)
	}

}

// doCmdEnvUpdate update the server environment by reading the JSON formatted
// environment from file or from stdin.
func (rsol *resolver) doCmdEnvUpdate(resc *rescached.Client, fileOrStdin string) (err error) {
	var envJSON []byte

	if fileOrStdin == "-" {
		envJSON, err = io.ReadAll(os.Stdin)
	} else {
		envJSON, err = os.ReadFile(fileOrStdin)
	}
	if err != nil {
		return fmt.Errorf("%s %s: %w", cmdEnv, subCmdUpdate, err)
	}

	var env *rescached.Environment

	err = json.Unmarshal(envJSON, &env)
	if err != nil {
		return fmt.Errorf("%s %s: %w", cmdEnv, subCmdUpdate, err)
	}

	env, err = resc.EnvUpdate(env)
	if err != nil {
		return fmt.Errorf("%s %s: %w", cmdEnv, subCmdUpdate, err)
	}

	envJSON, err = json.MarshalIndent(env, ``, `  `)
	if err != nil {
		return fmt.Errorf("%s %s: %w", cmdEnv, subCmdUpdate, err)
	}

	fmt.Println(string(envJSON))

	return nil
}

func (rsol *resolver) doCmdHostsd(args []string) {
	if len(args) == 0 {
		log.Fatalf("resolver: %s: missing argument", rsol.cmd)
	}

	var (
		subCmd = strings.ToLower(args[0])

		resc   *rescached.Client
		listrr []*dns.ResourceRecord
		jsonb  []byte
		err    error
	)
	switch subCmd {
	case subCmdCreate:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing hosts name argument", rsol.cmd, subCmd)
		}

		resc = rsol.newRescachedClient()
		_, err = resc.HostsdCreate(args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}
		fmt.Println("OK")

	case subCmdDelete:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing hosts name argument", rsol.cmd, subCmd)
		}

		resc = rsol.newRescachedClient()
		_, err = resc.HostsdDelete(args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}
		fmt.Println("OK")

	case subCmdGet:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing hosts name argument", rsol.cmd, subCmd)
		}

		resc = rsol.newRescachedClient()
		listrr, err = resc.HostsdGet(args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		jsonb, err = json.MarshalIndent(listrr, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		fmt.Println(string(jsonb))

	case subCmdRR:
		rsol.doCmdHostsdRecord(args[1:])

	default:
		log.Fatalf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
	}
}

func (rsol *resolver) doCmdHostsdRecord(args []string) {
	if len(args) == 0 {
		log.Fatalf("resolver: %s %s %s: missing arguments", rsol.cmd, cmdHostsd, subCmdRR)
	}

	var (
		subCmd = strings.ToLower(args[0])

		resc   *rescached.Client
		record *dns.ResourceRecord
		jsonb  []byte
		err    error
	)

	switch subCmd {
	case subCmdAdd:
		args = args[1:]
		if len(args) < 3 {
			log.Fatalf("resolver: missing arguments")
		}

		resc = rsol.newRescachedClient()
		record, err = resc.HostsdRecordAdd(args[0], args[1], args[2])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		jsonb, err = json.MarshalIndent(record, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		fmt.Println(string(jsonb))

	case subCmdDelete:
		args = args[1:]
		if len(args) <= 1 {
			log.Fatalf("resolver: %s %s: missing arguments", rsol.cmd, subCmd)
		}

		resc = rsol.newRescachedClient()
		record, err = resc.HostsdRecordDelete(args[0], args[1])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		jsonb, err = json.MarshalIndent(record, "", "  ")
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		fmt.Println(string(jsonb))

	default:
		log.Fatalf("resolver: %s %s: unknown command %s", rsol.cmd, subCmdRR, subCmd)
	}
}

func (rsol *resolver) doCmdQuery(args []string) {
	var (
		maxAttempts = defAttempts
		timeout     = defTimeout

		res       *dns.Message
		qname     string
		queries   []string
		nAttempts int
		err       error
		ok        bool
	)

	rsol.qname = args[0]

	switch len(args) {
	case 1:
		rsol.sqtype = defQueryType
		rsol.sqclass = defQueryClass

	case 2:
		rsol.sqtype = args[1]
		rsol.sqclass = defQueryClass

	case 3:
		rsol.sqtype = args[1]
		rsol.sqclass = args[2]
	}

	rsol.sqtype = strings.ToUpper(rsol.sqtype)
	rsol.qtype, ok = dns.RecordTypes[rsol.sqtype]
	if !ok {
		log.Fatalf("resolver: invalid query type: %q", rsol.sqtype)
	}

	rsol.sqclass = strings.ToUpper(rsol.sqclass)
	rsol.qclass, ok = dns.RecordClasses[rsol.sqclass]
	if !ok {
		log.Fatalf("resolver: invalid query class: %q", rsol.sqclass)
	}

	fmt.Printf("= options: %+v\n", rsol)

	if len(rsol.nameserver) == 0 {
		// Use the nameserver and configuration from resolv.conf.
		err = rsol.initSystemResolver()
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		fmt.Printf("= resolv.conf: %+v\n", rsol.conf)

		queries = rsol.conf.PopulateQuery(rsol.qname)
		timeout = time.Duration(rsol.conf.Timeout) * time.Second
		maxAttempts = rsol.conf.Attempts
	} else {
		rsol.dnsc, err = dns.NewClient(rsol.nameserver, rsol.insecure)
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}

		queries = append(queries, rsol.qname)
	}

	for _, qname = range queries {
		for nAttempts = 0; nAttempts < maxAttempts; nAttempts++ {
			fmt.Printf("\n< Query %s at %s\n", qname, rsol.dnsc.RemoteAddr())

			res, err = rsol.query(timeout, qname)
			if err != nil {
				log.Printf("resolver: %s", err)
				continue
			}

			printQueryResponse(rsol.dnsc.RemoteAddr(), res)
			if len(res.Answer) > 0 {
				return
			}
			break
		}
	}
}

func (rsol *resolver) doCmdZoned(args []string) {
	var (
		resc = rsol.newRescachedClient()

		zone     *dns.Zone
		zones    map[string]*dns.Zone
		zoneName string
		subCmd   string
		err      error
	)

	if len(args) == 0 {
		zones, err = resc.Zoned()
		if err != nil {
			log.Fatalf("resolver: %s: %s", rsol.cmd, err)
		}

		for zoneName, zone = range zones {
			fmt.Println(zoneName)
			fmt.Printf("  SOA: %+v\n", zone.SOA)
		}
		return
	}

	subCmd = strings.ToLower(args[0])

	switch subCmd {
	case subCmdCreate:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing parameter name", rsol.cmd, subCmd)
		}

		_, err = resc.ZonedCreate(args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}
		fmt.Println("OK")

	case subCmdDelete:
		args = args[1:]
		if len(args) == 0 {
			log.Fatalf("resolver: %s %s: missing parameter name", rsol.cmd, subCmd)
		}

		_, err = resc.ZonedDelete(args[0])
		if err != nil {
			log.Fatalf("resolver: %s", err)
		}
		fmt.Println("OK")

	case subCmdRR:
		rsol.doCmdZonedRR(resc, args[1:])

	default:
		log.Fatalf("resolver: %s: unknown sub command: %s", rsol.cmd, subCmd)
	}
}

func (rsol *resolver) doCmdZonedRR(resc *rescached.Client, args []string) {
	if len(args) == 0 {
		log.Fatalf("resolver: %s %s: missing arguments", rsol.cmd, subCmdRR)
	}

	var (
		cmdAction = strings.ToLower(args[0])
	)

	args = args[1:]

	switch cmdAction {
	case subCmdAdd:
		rsol.doCmdZonedRRAdd(resc, args)

	case subCmdDelete:
		rsol.doCmdZonedRRDelete(resc, args)

	case subCmdGet:
		rsol.doCmdZonedRRGet(resc, args)

	default:
		log.Fatalf("resolver: %s %s: unknown action: %q", rsol.cmd, subCmdRR, cmdAction)
	}
}

// doCmdZonedRRAdd add new record to the zone.
// This command accept the following arguments:
//
//	0      1        2     3      4       5
//	<zone> <domain> <ttl> <type> <class> <value> ...
//
// List of valid type are A, NS, CNAME, PTR, MX, TXT, and AAAA.
// For the MX record we pass two parameters:
//
//	5      6
//	<pref> <exchange>
func (rsol *resolver) doCmdZonedRRAdd(resc *rescached.Client, args []string) {
	if len(args) < 6 {
		log.Fatalf("resolver: %s %s %s: missing arguments", rsol.cmd, subCmdRR, subCmdAdd)
	}

	var (
		zone = strings.ToLower(args[0])
		rreq = dns.ResourceRecord{}

		rres   *dns.ResourceRecord
		vstr   string
		vuint  uint64
		vbytes []byte
		err    error
		ok     bool
	)

	rreq.Name = strings.ToLower(args[1])
	if rreq.Name == "@" {
		rreq.Name = ""
	}

	vuint, err = strconv.ParseUint(args[2], 10, 64)
	if err != nil {
		log.Fatalf("resolver: invalid TTL: %q", args[2])
	}

	rreq.TTL = uint32(vuint)

	vstr = strings.ToUpper(args[3])
	rreq.Type, ok = dns.RecordTypes[vstr]
	if !ok {
		log.Fatalf("resolver: invalid record type: %q", vstr)
	}

	vstr = strings.ToUpper(args[4])
	rreq.Class, ok = dns.RecordClasses[vstr]
	if !ok {
		log.Fatalf("resolver: invalid record class: %q", vstr)
	}

	vstr = args[5]

	if rreq.Type == dns.RecordTypeMX {
		if len(args) < 6 {
			log.Fatalf("resolver: missing argument for MX record")
		}
		vuint, err = strconv.ParseUint(vstr, 10, 64)
		if err != nil {
			log.Fatalf("resolver: invalid MX preference: %q", vstr)
		}
		var rrMX = &dns.RDataMX{
			Preference: int16(vuint),
			Exchange:   args[6],
		}
		rreq.Value = rrMX
	} else {
		rreq.Value = args[5]
	}

	rres, err = resc.ZonedRecordAdd(zone, rreq)
	if err != nil {
		log.Fatalf("resolver: %s", err)
	}

	vbytes, err = json.MarshalIndent(rres, "", "  ")
	if err != nil {
		log.Fatalf("resolver: %s", err)
	}

	fmt.Println(string(vbytes))
}

// doCmdZonedRRDelete delete record from zone.
// This command accept the following arguments:
//
//	0      1        2      3       4
//	<zone> <domain> <type> <class> <value> ...
func (rsol *resolver) doCmdZonedRRDelete(resc *rescached.Client, args []string) {
	if len(args) < 5 {
		log.Fatalf("resolver: %s %s %s: missing arguments", rsol.cmd, subCmdRR, subCmdDelete)
	}

	var (
		zone = strings.ToLower(args[0])
		rreq = dns.ResourceRecord{}

		zoneRecords map[string][]*dns.ResourceRecord
		vstr        string
		vuint       uint64
		err         error
		ok          bool
	)

	rreq.Name = strings.ToLower(args[1])
	if rreq.Name == "@" {
		rreq.Name = ""
	}

	vstr = strings.ToUpper(args[2])
	rreq.Type, ok = dns.RecordTypes[vstr]
	if !ok {
		log.Fatalf("resolver: invalid record type: %q", vstr)
	}

	vstr = strings.ToUpper(args[3])
	rreq.Class, ok = dns.RecordClasses[vstr]
	if !ok {
		log.Fatalf("resolver: invalid record class: %q", vstr)
	}

	vstr = args[4]

	if rreq.Type == dns.RecordTypeMX {
		if len(args) < 5 {
			log.Fatalf("resolver: missing argument for MX record")
		}
		vuint, err = strconv.ParseUint(vstr, 10, 64)
		if err != nil {
			log.Fatalf("resolver: invalid MX preference: %q", vstr)
		}
		var rrMX = &dns.RDataMX{
			Preference: int16(vuint),
			Exchange:   args[5],
		}
		rreq.Value = rrMX
	} else {
		rreq.Value = vstr
	}

	zoneRecords, err = resc.ZonedRecordDelete(zone, rreq)
	if err != nil {
		log.Fatalf("resolver: %s", err)
	}

	fmt.Println("OK")
	printZoneRecords(zoneRecords)
}

// doCmdZonedRRGet get and print the records on zone.
func (rsol *resolver) doCmdZonedRRGet(resc *rescached.Client, args []string) {
	if len(args) == 0 {
		log.Fatalf("resolver: missing zone argument")
	}

	var (
		zoneRecords map[string][]*dns.ResourceRecord
		err         error
	)

	zoneRecords, err = resc.ZonedRecords(args[0])
	if err != nil {
		log.Fatalf("resolver: %s", err)
	}

	printZoneRecords(zoneRecords)
}

// initSystemResolver read the system resolv.conf to create fallback DNS
// resolver.
func (rsol *resolver) initSystemResolver() (err error) {
	var (
		logp = "initSystemResolver"

		ns string
	)

	rsol.conf, err = libnet.NewResolvConf(defResolvConf)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}

	if len(rsol.conf.NameServers) == 0 {
		ns = "127.0.0.1:53"
	} else {
		ns = rsol.conf.NameServers[0]
	}

	rsol.dnsc, err = dns.NewUDPClient(ns)
	if err != nil {
		return fmt.Errorf("%s: %w", logp, err)
	}
	return nil
}

// newRescachedClient create new rescached Client.
func (rsol *resolver) newRescachedClient() (resc *rescached.Client) {
	if len(rsol.rescachedURL) == 0 {
		rsol.rescachedURL = defRescachedURL
	}
	resc = rescached.NewClient(rsol.rescachedURL, rsol.insecure)
	return resc
}

func (rsol *resolver) query(timeout time.Duration, qname string) (res *dns.Message, err error) {
	var (
		logp    = "query"
		req     = dns.NewMessage()
		randMax = big.NewInt(math.MaxUint16)

		randv *big.Int
	)

	rsol.dnsc.SetTimeout(timeout)

	randv, err = rand.Int(rand.Reader, randMax)
	if err != nil {
		log.Panicf(`%s: %s`, logp, err)
	}

	req.Header.ID = uint16(randv.Int64())
	req.Question.Name = qname
	req.Question.Type = rsol.qtype
	req.Question.Class = rsol.qclass
	_, err = req.Pack()
	if err != nil {
		return nil, fmt.Errorf("%s: %s: %w", logp, qname, err)
	}

	res, err = rsol.dnsc.Query(req)
	if err != nil {
		return nil, fmt.Errorf("%s: %s: %w", logp, qname, err)
	}

	return res, nil
}

// printAnswers print list of DNS Answer to stdout.
func printAnswers(answers []*dns.Answer) {
	if len(answers) == 0 {
		return
	}

	var (
		timeNow = time.Now()

		answer     *dns.Answer
		receivedAt time.Duration
		accessedAt time.Duration
		format     string
		header     string
		line       strings.Builder
		x          int
		maxNameLen int
	)

	for _, answer = range answers {
		if len(answer.QName) > maxNameLen {
			maxNameLen = len(answer.QName)
		}
	}

	format = fmt.Sprintf("%%4s | %%%ds | %%4s | %%5s | %%12s | %%12s", maxNameLen)
	header = fmt.Sprintf(format, "#", "Name", "Type", "Class", "Received at", "Accessed at")
	for x = 0; x < len(header); x++ {
		line.WriteString("-")
	}
	fmt.Println(line.String())
	fmt.Println(header)
	fmt.Println(line.String())

	format = fmt.Sprintf("%%4d | %%%ds | %%4s | %%5s | %%12s | %%12s\n", maxNameLen)
	for x, answer = range answers {
		receivedAt = timeNow.Sub(time.Unix(answer.ReceivedAt, 0)).Truncate(time.Second)
		accessedAt = timeNow.Sub(time.Unix(answer.AccessedAt, 0)).Truncate(time.Second)
		fmt.Printf(format, x, answer.QName,
			dns.RecordTypeNames[answer.RType],
			dns.RecordClassName[answer.RClass],
			receivedAt.String()+" ago",
			accessedAt.String()+" ago",
		)
	}
}

// printMessages print list of DNS Message to standard output.
func printMessages(listMsg []*dns.Message) {
	var (
		msg *dns.Message
	)

	for _, msg = range listMsg {
		printMessage(msg)
	}
}

// printMessage print a DNS Message to standard output.
func printMessage(msg *dns.Message) {
	var (
		rr dns.ResourceRecord
		x  int
	)

	fmt.Printf("\nQuestion: %+v\n", msg.Question)
	fmt.Printf("  Header: %+v\n", msg.Header)

	for x, rr = range msg.Answer {
		fmt.Printf("  Answer #%d\n", x)
		fmt.Printf("    Resource record: %s\n", rr.String())
		fmt.Printf("    RDATA: %+v\n", rr.Value)
	}
	for x, rr = range msg.Authority {
		fmt.Printf("  Authority #%d\n", x)
		fmt.Printf("    Resource record: %s\n", rr.String())
		fmt.Printf("    RDATA: %+v\n", rr.Value)
	}
	for x, rr = range msg.Additional {
		fmt.Printf("  Additional #%d\n", x)
		fmt.Printf("    Resource record: %s\n", rr.String())
		fmt.Printf("    RDATA: %+v\n", rr.Value)
	}
}

// printQueryResponse print query response from nameserver including its DNS
// message as answer to stdout.
func printQueryResponse(nameserver string, msg *dns.Message) {
	var b strings.Builder

	fmt.Fprintf(&b, "> From: %s", nameserver)

	b.WriteString("\n> Status: ")
	switch msg.Header.RCode {
	case dns.RCodeOK:
		b.WriteString("OK")
	case dns.RCodeErrFormat:
		b.WriteString("Invalid request format")
	case dns.RCodeErrServer:
		b.WriteString("Server internal failure")
	case dns.RCodeErrName:
		fmt.Fprintf(&b, "Domain name with type %s and class %s did not exist",
			dns.RecordTypeNames[msg.Question.Type],
			dns.RecordClassName[msg.Question.Class])
	case dns.RCodeNotImplemented:
		b.WriteString(" Unknown query")
	case dns.RCodeRefused:
		b.WriteString(" Server refused the request")
	}
	b.WriteString("\n> Response: ")
	fmt.Println(b.String())
	printMessage(msg)
}

func printZoneRecords(zr map[string][]*dns.ResourceRecord) {
	var (
		dname  string
		listRR []*dns.ResourceRecord
		rr     *dns.ResourceRecord
	)

	for dname, listRR = range zr {
		fmt.Println(dname)
		for _, rr = range listRR {
			fmt.Printf("  %6d %2s %2s %v\n",
				rr.TTL,
				dns.RecordTypeNames[rr.Type],
				dns.RecordClassName[rr.Class],
				rr.Value)
		}
	}
}
