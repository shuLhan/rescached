package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/shuLhan/share/lib/dns"
)

func usage() {
	fmt.Println("Usage: " + os.Args[0] + " <nameserver> <hosts-file>")
	os.Exit(1)
}

func main() {
	if len(os.Args) < 3 {
		usage()
	}

	log.SetFlags(0)

	cl, err := dns.NewUDPClient(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}

	hostsFile, err := dns.ParseHostsFile(os.Args[2])
	if err != nil {
		log.Fatal(err)
	}

	var nfail int

	fmt.Printf("= Benchmarking with %d messages\n", len(hostsFile.Messages))

	timeStart := time.Now()
	for x := 0; x < len(hostsFile.Messages); x++ {
		res, err := cl.Query(hostsFile.Messages[x])
		if err != nil {
			nfail++
			log.Println("! Send error: ", err)
			continue
		}

		exp := hostsFile.Messages[x].Answer[0].RData().([]byte)
		got := res.Answer[0].RData().([]byte)

		if !bytes.Equal(exp, got) {
			nfail++
			log.Printf(`! Answer not matched %s:
expecting: %s
got: %s
`, hostsFile.Messages[x].Question.String(), exp, got)
		}
	}
	timeEnd := time.Now()

	fmt.Printf("= Total: %d\n", len(hostsFile.Messages))
	fmt.Printf("= Failed: %d\n", nfail)
	fmt.Printf("= Elapsed time: %v\n", timeEnd.Sub(timeStart))
}
