package main

import (
	"bytes"
	"fmt"
	"log"
	"os"

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
	res := libdns.NewMessage()

	fmt.Printf("= Benchmarking with %d messages\n", len(msgs))

	for x := 0; x < len(msgs); x++ {
		//fmt.Printf("< Request: %6d %s\n", x, msgs[x].Question)

		_, err = cl.Send(msgs[x], cl.Addr)
		if err != nil {
			nfail++
			log.Println("! Send error: ", err)
			continue
		}

		res.Reset()

		_, err = cl.Recv(res)
		if err != nil {
			nfail++
			log.Println("! Recv error: ", err)
			continue
		}

		err = res.Unpack()
		if err != nil {
			nfail++
			log.Println("! Unpack:", err)
			continue
		}

		exp := msgs[x].Answer[0].RData().([]byte)
		got := res.Answer[0].RData().([]byte)

		if !bytes.Equal(exp, got) {
			nfail++
			log.Printf(`! Answer not matched:
expecting: %s
got: %s
`, exp, got)
		}
	}

	fmt.Printf("= Total: %d\n", len(msgs))
	fmt.Printf("= Failed: %d\n", nfail)
}
