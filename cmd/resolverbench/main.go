package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"time"

	libdns "github.com/shuLhan/share/lib/dns"
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

	cl, err := libdns.NewUDPClient(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}

	msgs, err := libdns.HostsLoad(os.Args[2])
	if err != nil {
		log.Fatal(err)
	}

	var nfail int

	fmt.Printf("= Benchmarking with %d messages\n", len(msgs))

	timeStart := time.Now()
	for x := 0; x < len(msgs); x++ {
		res, err := cl.Query(msgs[x])
		if err != nil {
			nfail++
			log.Println("! Send error: ", err)
			continue
		}

		exp := msgs[x].Answer[0].RData().([]byte)
		got := res.Answer[0].RData().([]byte)

		if !bytes.Equal(exp, got) {
			nfail++
			log.Printf(`! Answer not matched %s:
expecting: %s
got: %s
`, msgs[x].Question, exp, got)
		}
	}
	timeEnd := time.Now()

	fmt.Printf("= Total: %d\n", len(msgs))
	fmt.Printf("= Failed: %d\n", nfail)
	fmt.Printf("= Elapsed time: %v\n", timeEnd.Sub(timeStart))
}
