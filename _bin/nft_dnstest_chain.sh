#!/bin/sh
## SPDX-FileCopyrightText: 2021 M. Shulhan <ms@kilabit.info>
## SPDX-License-Identifier: GPL-3.0-or-later


if [[ "$1" == "flush" ]]; then
	echo "nft: delete chain dnstest";
	nft delete chain ip nat dnstest;
	exit 0
fi

## Forward port 53 to 5350 for testing.

nft -- add chain ip nat dnstest { type nat hook output priority 0 \; }
nft add rule ip nat dnstest tcp dport 53 redirect to 5350
nft add rule ip nat dnstest udp dport 53 redirect to 5350
