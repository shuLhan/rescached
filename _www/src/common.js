const RRTypes = {
	1: "A",
	2: "NS",
	5: "CNAME",
	12: "PTR",
	15: "MX",
	16: "TXT",
	28: "AAAA",
}

export function getRRTypeName(k) {
	let v = RRTypes[k]
	if (v === "") {
		return k
	}
	return v
}
