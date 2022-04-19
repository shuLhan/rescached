// SPDX-FileCopyrightText: 2021 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

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

function getRRTypeName(k) {
	let v = RRTypes[k]
	if (v === "") {
		return k
	}
	return v
}

class Rescached {
	static nanoSeconds = 1000000000
	static apiCaches = "/api/caches"
	static apiCachesSearch = "/api/caches/search"
	static apiHostsd = "/api/hosts.d/"
	static apiZoned = "/api/zone.d/"

	constructor(server) {
		this.server = server
		this.env = {}
	}

	async Caches() {
		const res = await fetch(this.server + Rescached.apiCaches, {
			headers: {
				Connection: "keep-alive",
			},
		})
		return await res.json()
	}

	async CacheRemove(qname) {
		const res = await fetch(
			this.server + Rescached.apiCaches + "?name=" + qname,
			{
				method: "DELETE",
			},
		)
		return await res.json()
	}

	async Search(query) {
		console.log("Search: ", query)
		const res = await fetch(
			this.server +
				Rescached.apiCachesSearch +
				"?query=" +
				query,
		)
		return await res.json()
	}

	async HostsFileCreate(name) {
		const httpRes = await fetch(
			this.server + Rescached.apiHostsd + name,
			{
				method: "PUT",
			},
		)
		let res = await httpRes.json()
		if (res.code === 200) {
			this.env.HostsFiles[name] = {
				Name: name,
				Records: [],
			}
		}
		return res
	}

	async getEnvironment() {
		const httpRes = await fetch(this.server + "/api/environment")
		const res = await httpRes.json()

		if (httpRes.status === 200) {
			res.data.PruneDelay =
				res.data.PruneDelay / Rescached.nanoSeconds
			res.data.PruneThreshold =
				res.data.PruneThreshold /
				Rescached.nanoSeconds

			for (let k in res.data.HostsFiles) {
				if (!res.data.HostsFiles.hasOwnProperty(k)) {
					continue
				}
				let hf = res.data.HostsFiles[k]
				if (typeof hf.Records === "undefined") {
					hf.Records = []
				}
			}
			this.env = res.data
		}
		return res
	}

	GetRRTypeName(k) {
		let v = RRTypes[k]
		if (v === "") {
			return k
		}
		return v
	}

	async HostsFileDelete(name) {
		const httpRes = await fetch(
			this.server + Rescached.apiHostsd + name,
			{
				method: "DELETE",
			},
		)
		const res = await httpRes.json()
		if (httpRes.status === 200) {
			delete this.env.HostsFiles[name]
		}
		return res
	}

	async HostsFileGet(name) {
		const httpRes = await fetch(
			this.server + Rescached.apiHostsd + name,
		)
		let res = await httpRes.json()
		if (httpRes.Status === 200) {
			this.env.HostsFiles[name] = {
				Name: name,
				Records: res.data,
			}
		}
		return res
	}

	async HostsFileRecordAdd(hostsFile, domain, value) {
		let params = new URLSearchParams()
		params.set("domain", domain)
		params.set("value", value)

		const api =
			this.server +
			Rescached.apiHostsd +
			hostsFile +
			"/rr" +
			"?" +
			params.toString()

		const httpRes = await fetch(api, {
			method: "POST",
		})
		const res = await httpRes.json()
		if (httpRes.Status === 200) {
			let hf = this.env.HostsFiles[hostsFile]
			hf.Records.push(res.data)
		}
		return res
	}

	async HostsFileRecordDelete(hostsFile, domain) {
		let params = new URLSearchParams()
		params.set("domain", domain)

		const api =
			this.server +
			Rescached.apiHostsd +
			hostsFile +
			"/rr" +
			"?" +
			params.toString()

		const httpRes = await fetch(api, {
			method: "DELETE",
		})
		const res = await httpRes.json()
		if (httpRes.Status === 200) {
			let hf = this.env.HostsFiles[hostsFile]
			for (let x = 0; x < hf.Records.length; x++) {
				if (hf.Records[x].Name === domain) {
					hf.Records.splice(x, 1)
				}
			}
		}
		return res
	}

	async updateEnvironment() {
		let got = {}

		Object.assign(got, this.env)

		got.PruneDelay = got.PruneDelay * this.nanoSeconds
		got.PruneThreshold = got.PruneThreshold * this.nanoSeconds

		const httpRes = await fetch(
			this.server + "/api/environment",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(got),
			},
		)

		return await httpRes.json()
	}

	async updateHostsBlocks(hostsBlocks) {
		const httpRes = await fetch(
			this.server + "/api/block.d",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(hostsBlocks),
			},
		)
		return await httpRes.json()
	}

	async ZoneFileCreate(name) {
		const httpRes = await fetch(
			this.server + Rescached.apiZoned + name,
			{
				method: "PUT",
			},
		)
		let res = await httpRes.json()
		if (res.code == 200) {
			this.env.ZoneFiles[name] = res.data
		}
		return res
	}

	async ZoneFileDelete(name) {
		const httpRes = await fetch(
			this.server + Rescached.apiZoned + name,
			{
				method: "DELETE",
			},
		)
		let res = await httpRes.json()
		if (res.code == 200) {
			delete this.env.ZoneFiles[name]
		}
		return res
	}

	async ZoneFileRecordCreate(name, rr) {
		let api =
			this.server +
			Rescached.apiZoned +
			name +
			"/rr/" +
			rr.Type
		const httpRes = await fetch(api, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(rr),
		})
		let res = await httpRes.json()
		if (httpRes.status === 200) {
			let zf = this.env.ZoneFiles[name]
			if (rr.Type == 6) {
				// SOA.
				zf.SOA = res.data
			} else {
				zf.Records = res.data
			}
		}
		return res
	}

	async ZoneFileRecordDelete(name, rr) {
		let api =
			this.server +
			Rescached.apiZoned +
			name +
			"/rr/" +
			rr.Type
		const httpRes = await fetch(api, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(rr),
		})
		let res = await httpRes.json()
		if (httpRes.status === 200) {
			this.env.ZoneFiles[name].Records = res.data
		}
		return res
	}
}
