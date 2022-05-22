// SPDX-FileCopyrightText: 2021 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

const RRTypes = {
  1 : "A",
  2 : "NS",
  3 : "MD",
  4 : "MF",
  5 : "CNAME",
  6 : "SOA",
  7 : "MB",
  8 : "MG",
  9 : "MR",
  10 : "NULL",
  11 : "WKS",
  12 : "PTR",
  13 : "HINFO",
  14 : "MINFO",
  15 : "MX",
  16 : "TXT",
  28 : "AAAA",
  33 : "SRV",
  41 : "OPT",
};

const contentTypeForm = "application/x-www-form-urlencoded";
const contentTypeJson = "application/json";

const paramNameName = "name";

const headerContentType = "Content-Type";

function getRRTypeName(k) {
  let v = RRTypes[k];
  if (v === "") {
    return k;
  }
  return v;
}

class Rescached {
  static nanoSeconds = 1000000000;
  static apiBlockd = "/api/block.d";
  static apiBlockdFetch = "/api/block.d/fetch";
  static apiCaches = "/api/caches";
  static apiCachesSearch = "/api/caches/search";
  static apiHostsd = "/api/hosts.d";
  static apiHostsdRR = "/api/hosts.d/rr";
  static apiZoned = "/api/zone.d";
  static apiZonedRR = "/api/zone.d/rr";

  constructor(server) {
    this.server = server;
    this.env = {};
  }

  async BlockdFetch(name) {
    let params = new URLSearchParams();
    params.set("name", name);

    const httpRes = await fetch(Rescached.apiBlockdFetch, {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeForm,
      },
      body : params.toString(),
    });
    return await httpRes.json();
  }

  async BlockdUpdate(hostsBlocks) {
    const httpRes = await fetch(Rescached.apiBlockd, {
      method : "PUT",
      headers : {
        [headerContentType] : contentTypeJson,
      },
      body : JSON.stringify(hostsBlocks),
    });
    return await httpRes.json();
  }

  async Caches() {
    const res = await fetch(this.server + Rescached.apiCaches, {
      headers : {
        Connection : "keep-alive",
      },
    });
    return await res.json();
  }

  async CacheRemove(qname) {
    const res =
        await fetch(this.server + Rescached.apiCaches + "?name=" + qname, {
          method : "DELETE",
        });
    return await res.json();
  }

  async Search(query) {
    console.log("Search: ", query);
    const res = await fetch(this.server + Rescached.apiCachesSearch +
                            "?query=" + query);
    return await res.json();
  }

  async getEnvironment() {
    const httpRes = await fetch(this.server + "/api/environment");
    const res = await httpRes.json();

    if (httpRes.status === 200) {
      res.data.PruneDelay = res.data.PruneDelay / Rescached.nanoSeconds;
      res.data.PruneThreshold = res.data.PruneThreshold / Rescached.nanoSeconds;

      for (let k in res.data.HostsFiles) {
        if (!res.data.HostsFiles.hasOwnProperty(k)) {
          continue;
        }
        let hf = res.data.HostsFiles[k];
        if (typeof hf.Records === "undefined") {
          hf.Records = [];
        }
      }
      this.env = res.data;
    }
    return res;
  }

  GetRRTypeName(k) {
    let v = RRTypes[k];
    if (v === "") {
      return k;
    }
    return v;
  }

  async HostsFileCreate(name) {
    var params = new URLSearchParams();
    params.set(paramNameName, name);

    const httpRes = await fetch(Rescached.apiHostsd, {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeForm,
      },
      body : params.toString(),
    });
    let res = await httpRes.json();
    if (res.code === 200) {
      this.env.HostsFiles[name] = {
        Name : name,
        Records : [],
      };
    }
    return res;
  }

  async HostsFileDelete(name) {
    var params = new URLSearchParams();
    params.set(paramNameName, name);

    var url = Rescached.apiHostsd + "?" + params.toString();
    const httpRes = await fetch(url, {
      method : "DELETE",
    });
    const res = await httpRes.json();
    if (httpRes.status === 200) {
      delete this.env.HostsFiles[name];
    }
    return res;
  }

  async HostsFileGet(name) {
    var params = new URLSearchParams();
    params.set(paramNameName, name);

    var url = Rescached.apiHostsd + "?" + params.toString();
    const httpRes = await fetch(url);

    let res = await httpRes.json();
    if (httpRes.Status === 200) {
      this.env.HostsFiles[name] = {
        Name : name,
        Records : res.data,
      };
    }
    return res;
  }

  async HostsdRecordAdd(hostsFile, domain, value) {
    let params = new URLSearchParams();
    params.set("name", hostsFile);
    params.set("domain", domain);
    params.set("value", value);

    const httpRes = await fetch(Rescached.apiHostsdRR, {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeForm,
      },
      body : params.toString(),
    });
    const res = await httpRes.json();
    if (httpRes.Status === 200) {
      let hf = this.env.HostsFiles[hostsFile];
      hf.Records.push(res.data);
    }
    return res;
  }

  async HostsdRecordDelete(hostsFile, domain) {
    let params = new URLSearchParams();
    params.set("name", hostsFile);
    params.set("domain", domain);

    const api = Rescached.apiHostsdRR + "?" + params.toString();

    const httpRes = await fetch(api, {
      method : "DELETE",
    });
    const res = await httpRes.json();
    if (httpRes.Status === 200) {
      let hf = this.env.HostsFiles[hostsFile];
      for (let x = 0; x < hf.Records.length; x++) {
        if (hf.Records[x].Name === domain) {
          hf.Records.splice(x, 1);
        }
      }
    }
    return res;
  }

  async updateEnvironment() {
    let got = {};

    Object.assign(got, this.env);

    got.PruneDelay = got.PruneDelay * this.nanoSeconds;
    got.PruneThreshold = got.PruneThreshold * this.nanoSeconds;

    const httpRes = await fetch(this.server + "/api/environment", {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeJson,
      },
      body : JSON.stringify(got),
    });

    return await httpRes.json();
  }

  async ZoneFileCreate(name) {
    let params = new URLSearchParams();
    params.set(paramNameName, name);

    const httpRes = await fetch(Rescached.apiZoned, {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeForm,
      },
      body : params.toString(),
    });
    let res = await httpRes.json();
    if (res.code == 200) {
      this.env.Zones[name] = res.data;
    }
    return res;
  }

  async ZoneFileDelete(name) {
    let params = new URLSearchParams();
    params.set(paramNameName, name);

    let url = Rescached.apiZoned + "?" + params.toString();
    const httpRes = await fetch(url, {
      method : "DELETE",
    });
    let res = await httpRes.json();
    if (res.code == 200) {
      delete this.env.Zones[name];
    }
    return res;
  }

  // ZonedRecords fetch the RR on specific zone.
  async ZonedRecords(name) {
    let params = new URLSearchParams();
    params.set(paramNameName, name);

    let url = Rescached.apiZonedRR + "?" + params.toString();
    const httpRes = await fetch(url);
    let res = await httpRes.json();
    return res;
  }

  async ZonedRecordAdd(name, rr) {
    let req = {
      name : name,
      type : getRRTypeName(rr.Type),
      record : btoa(JSON.stringify(rr)),
    };

    const httpRes = await fetch(Rescached.apiZonedRR, {
      method : "POST",
      headers : {
        [headerContentType] : contentTypeJson,
      },
      body : JSON.stringify(req),
    });

    let res = await httpRes.json();
    if (httpRes.status === 200) {
      let zf = this.env.Zones[name];
      if (rr.Type == 6) {
        zf.SOA = res.data;
      } else {
        let rr = res.data;
        if (zf.Records == null) {
          zf.Records = {};
        }
        zf.Records[rr.Name].push(rr);
      }
    }
    return res;
  }

  async ZonedRecordDelete(zone, rr) {
    let params = new URLSearchParams();
    params.set(paramNameName, zone);
    params.set("type", getRRTypeName(rr.Type));
    params.set("record", btoa(JSON.stringify(rr)));

    let api = Rescached.apiZonedRR + "?" + params.toString();

    const httpRes = await fetch(api, {
      method : "DELETE",
    });

    let res = await httpRes.json();
    if (httpRes.status === 200) {
      this.env.Zones[zone].Records = res.data;
    }
    return res;
  }
}
