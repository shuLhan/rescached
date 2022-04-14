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

func (rsol *resolver) doCmdCaches() {
	var (
		resc       *rescached.Client
		answer     *dns.Answer
		answers    []*dns.Answer
		format     string
		header     string
		line       strings.Builder
		err        error
		x          int
		maxNameLen int
	)

	if len(rsol.rescachedUrl) == 0 {
		rsol.rescachedUrl = defRescachedUrl
	}

	resc = rescached.NewClient(rsol.rescachedUrl, rsol.insecure)

	answers, err = resc.Caches()
	if err != nil {
		log.Printf("resolver: caches: %s", err)
		return
	}

	fmt.Printf("Total caches: %d\n", len(answers))

	for _, answer = range answers {
		if len(answer.QName) > maxNameLen {
			maxNameLen = len(answer.QName)
		}
	}

	format = fmt.Sprintf("%%4s | %%%ds | %%4s | %%5s | %%30s | %%30s", maxNameLen)
	header = fmt.Sprintf(format, "#", "Name", "Type", "Class", "Received at", "Accessed at")
	for x = 0; x < len(header); x++ {
		line.WriteString("-")
	}
	fmt.Println(line.String())
	fmt.Println(header)
	fmt.Println(line.String())

	format = fmt.Sprintf("%%4d | %%%ds | %%4s | %%5s | %%30s | %%30s\n", maxNameLen)
	for x, answer = range answers {
		fmt.Printf(format, x, answer.QName,
			dns.RecordTypeNames[answer.RType],
			dns.RecordClassName[answer.RClass],
			time.Unix(answer.ReceivedAt, 0),
			time.Unix(answer.AccessedAt, 0),
		)
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

		queries = populateQueries(rsol.conf, rsol.qname)
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
			fmt.Printf("< Query %s at %s\n", qname, rsol.dnsc.RemoteAddr())

			res, err = rsol.query(timeout, qname)
			if err != nil {
				log.Printf("resolver: %s", err)
				continue
			}

			printQueryResponse(rsol.dnsc.RemoteAddr(), res)
			return
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

func populateQueries(cr *libnet.ResolvConf, qname string) (queries []string) {
	ndots := 0

	for _, c := range qname {
		if c == '.' {
			ndots++
			continue
		}
	}

	if ndots >= cr.NDots {
		queries = append(queries, qname)
	} else {
		if len(cr.Domain) > 0 {
			queries = append(queries, qname+"."+cr.Domain)
		}
		for _, s := range cr.Search {
			queries = append(queries, qname+"."+s)
		}
	}

	return
}

func printQueryResponse(nameserver string, msg *dns.Message) {
	var b strings.Builder

	fmt.Fprintf(&b, "> From: %s", nameserver)
	fmt.Fprintf(&b, "\n> Header: %+v", msg.Header)
	fmt.Fprintf(&b, "\n> Question: %s", msg.Question.String())

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

	for x, rr := range msg.Answer {
		fmt.Fprintf(&b, "\n> Answer #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %+v", rr.Value)
	}
	for x, rr := range msg.Authority {
		fmt.Fprintf(&b, "\n> Authority #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %+v", rr.Value)
	}
	for x, rr := range msg.Additional {
		fmt.Fprintf(&b, "\n> Additional #%d:", x+1)
		fmt.Fprintf(&b, "\n>> Resource record: %s", rr.String())
		fmt.Fprintf(&b, "\n>> RDATA: %+v", rr.Value)
	}

	fmt.Println(b.String())
}
