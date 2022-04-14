// SPDX-FileCopyrightText: 2018 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

package main

import (
	"fmt"
	"log"
	"math/rand"
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
	defRescachedUrl = "http://127.0.0.1:5380"
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
	rescachedUrl string

	qtype  dns.RecordType
	qclass dns.RecordClass

	insecure bool
}

// doCmdCaches call the rescached HTTP API to fetch all caches.
func (rsol *resolver) doCmdCaches() {
	var (
		resc = rsol.newRescachedClient()

		answers []*dns.Answer
		err     error
	)

	answers, err = resc.Caches()
	if err != nil {
		log.Printf("resolver: caches: %s", err)
		return
	}

	fmt.Printf("Total caches: %d\n", len(answers))
	printAnswers(answers)
}

// doCmdCachesRemove remove an answer from caches by domain name.
func (rsol *resolver) doCmdCachesRemove(q string) {
	var (
		resc = rsol.newRescachedClient()

		listAnswer []*dns.Answer
		err        error
	)

	listAnswer, err = resc.CachesRemove(q)
	if err != nil {
		log.Printf("resolver: caches: %s", err)
		return
	}

	fmt.Printf("Total answer removed: %d\n", len(listAnswer))
	if len(listAnswer) == 0 {
		return
	}
	printAnswers(listAnswer)
}

// doCmdCachesSearch call the rescached HTTP API to search the caches by
// domain name.
func (rsol *resolver) doCmdCachesSearch(q string) {
	var (
		resc = rsol.newRescachedClient()

		listMsg []*dns.Message
		err     error
	)

	listMsg, err = resc.CachesSearch(q)
	if err != nil {
		log.Printf("resolver: caches: %s", err)
		return
	}

	fmt.Printf("Total search: %d\n", len(listMsg))
	printMessages(listMsg)
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

//
// initSystemResolver read the system resolv.conf to create fallback DNS
// resolver.
//
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
	if len(rsol.rescachedUrl) == 0 {
		rsol.rescachedUrl = defRescachedUrl
	}
	resc = rescached.NewClient(rsol.rescachedUrl, rsol.insecure)
	return resc
}

func (rsol *resolver) query(timeout time.Duration, qname string) (res *dns.Message, err error) {
	var (
		logp = "query"
		req  = dns.NewMessage()
	)

	rand.Seed(time.Now().Unix())

	rsol.dnsc.SetTimeout(timeout)

	req.Header.ID = uint16(rand.Intn(65535))
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
