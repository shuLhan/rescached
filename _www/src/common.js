const RRTypes = {
	1: "A",
	2: "NS",
	3: "MD",
	4: "MF",
	5: "CNAME",
	6: "SOA",
	7: "MB",
	8: "MG",
	9: "MR",
	10: "NULL",
	11: "WKS",
	12: "PTR",
	13: "HINFO",
	14: "MINFO",
	15: "MX",
	16: "TXT",
	28: "AAAA",
	33: "SRV",
	41: "OPT",
}

export function getRRTypeName(k) {
	let v = RRTypes[k]
	if (v === "") {
		return k
	}
	return v
}
