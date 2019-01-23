#!/bin/sh
## Copyright 2018, Shulhan <ms@kilabit.info>. All rights reserved.
## Use of this source code is governed by a BSD-style
## license that can be found in the LICENSE file.

if [[ ${UID} != 0 ]]; then
	echo "[rescached] User root is needed for overwriting '${HOSTS_BLOCK}'!"
	exit 1
fi

HOSTS_BLOCK=/etc/rescached/hosts.d/hosts.block
TMP_HOSTS=/tmp/hosts.raw

wget -O - "http://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&startdate[day]=&startdate[month]=&startdate[year]=&mimetype=plaintext" > $TMP_HOSTS
wget -O - "http://www.malwaredomainlist.com/hostslist/hosts.txt" >> $TMP_HOSTS
wget -O - "http://winhelp2002.mvps.org/hosts.txt" >> $TMP_HOSTS
wget -O - "http://someonewhocares.org/hosts/hosts" >> $TMP_HOSTS

echo ">> generating '$HOSTS_BLOCK' from '$TMP_HOSTS'"

cat $TMP_HOSTS | \
	sed	-e 's/#.*//' \
		-e 's///' \
		-e 's/\s*$//' \
		-e '/^$/ d' \
		-e 's/[ 	][ 	]*/ /g' \
		-e 's/0\.0\.0\.0/127.0.0.2/' \
		-e 's/127\.0\.0\.1/127.0.0.2/' - \
| sort | uniq > $HOSTS_BLOCK
