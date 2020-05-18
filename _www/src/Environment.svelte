<script>
	import { onMount } from 'svelte';

	import LabelHint from "./LabelHint.svelte";
	import InputNumber from "./InputNumber.svelte";
	import InputAddress from "./InputAddress.svelte";

	const nanoSeconds = 1000000000;
	let apiEnvironment = "http://127.0.0.1:5380/api/environment"
	let env = {
		NameServers: [],
	};

	onMount(async () => {
		const res = await fetch(apiEnvironment);
		let got = await res.json();
		got.PruneDelay = got.PruneDelay / nanoSeconds;
		got.PruneThreshold = got.PruneThreshold / nanoSeconds;
		env = Object.assign(env, got)
	});

	function addNameServer() {
		env.NameServers = [...env.NameServers, '']
	}

	function deleteNameServer(ns) {
		for (let x = 0; x < env.NameServers.length; x++) {
			if (env.NameServers[x] === ns) {
				env.NameServers.splice(x, 1);
				env.NameServers = env.NameServers;
				break;
			}
		}
	}

	async function updateEnvironment() {
		let got = {};

		Object.assign(got, env)
		got.PruneDelay = got.PruneDelay * nanoSeconds;
		got.PruneThreshold = got.PruneThreshold * nanoSeconds;

		const res = await fetch(apiEnvironment, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(got),
		});

		const resJSON = await res.json()

		console.log(resJSON);
	}
</script>

<style>
	input {
		width: 100%;
	}
	.input-deletable {
		width: 100%;
	}
	.input-deletable > input {
		float: left;
		max-width: calc(100% - 80px);
	}
	.input-deletable > button {
		float: left;
		width: 80px;
	}
	.input-suffix input {
		width: 70%;
	}
	.input-suffix input[type="checkbox"] {
		width: auto;
	}
	.input-suffix .suffix {
		width: 30%;
	}
</style>

<div class="environment">
<h2>
	/ Environment
</h2>

<p>
This page allow you to change the rescached environment.
Upon save, the rescached service will be restarted.
</p>

<h3>rescached</h3>
<div>
	<LabelHint
		target="FileResolvConf"
		title="System resolv.conf"
		info="A path to dynamically generated resolv.conf(5) by
resolvconf(8).  If set, the nameserver values in referenced file will
replace 'parent' value and 'parent' will become a fallback in
case the referenced file being deleted or can not be parsed."
	></LabelHint>
	<input name="FileResolvConf" bind:value={env.FileResolvConf}>

	<LabelHint
		target="Debug"
		title="Debug level"
		info="This option only used for debugging program or if user
want to monitor what kind of traffic goes in and out of rescached."
	></LabelHint>
	<InputNumber min=0 max=3 bind:val={env.Debug} unit="">
	</InputNumber>
</div>

<h3>DNS server</h3>
<div>
	<LabelHint
		target="NameServers"
		title="Name servers"
		info="List of parent DNS servers."
	></LabelHint>
	{#each env.NameServers as ns}
	<div class="input-deletable">
		<input bind:value={ns}>
		<button on:click={deleteNameServer(ns)}>
			Delete
		</button>
	</div>
	{/each}
	<button on:click={addNameServer}>
		Add
	</button>

	<LabelHint
		target="ListenAddress"
		title="Listen address"
		info="Address in local network where rescached will
listening for query from client through UDP and TCP.
<br/>
If you want rescached to serve a query from another host in your local
network, change this value to <tt>0.0.0.0:53</tt>."
	></LabelHint>
	<InputAddress
		bind:value={env.ListenAddress}
	></InputAddress>

	<LabelHint
		target="HTTPPort"
		title="HTTP listen port"
		info="Port to serve DNS over HTTP"
	></LabelHint>
	<InputNumber min=0 max=65535 bind:val={env.HTTPPort} unit="">
	</InputNumber>

	<LabelHint
		target="TLSPort"
		title="TLS listen port"
		info="Port to listen for DNS over TLS"
	></LabelHint>
	<InputNumber min=0 max=65535 bind:val={env.TLSPort} unit="">
	</InputNumber>

	<LabelHint
		target="TLSCertFile"
		title="TLS certificate"
		info="Path to certificate file to serve DNS over TLS and
HTTPS"></LabelHint>
	<input name="TLSCertFile" bind:value={env.TLSCertFile}>

	<LabelHint
		target="TLSPrivateKey"
		title="TLS private key"
		info="Path to certificate private key file to serve DNS over TLS and
HTTPS."
	></LabelHint>
	<input name="TLSPrivateKey" bind:value={env.TLSPrivateKey}>

	<LabelHint
		target="TLSAllowInsecure"
		title="TLS allow insecure"
		info="If its true, allow serving DoH and DoT with self signed
certificate."
	></LabelHint>
	<div class="input-suffix">
		<input
			name="TLSAllowInsecure"
			type=checkbox
			bind:checked={env.TLSAllowInsecure}
		>
		<span class="suffix">
			Yes
		</span>
	</div>

	<LabelHint
		target="DoHBehindProxy"
		title="DoH behind proxy"
		info="If its true, serve DNS over HTTP only, even if
certificate files is defined.
This allow serving DNS request forwarded by another proxy server."
	></LabelHint>
	<div class="input-suffix">
		<input
			name="DoHBehindProxy"
			type=checkbox
			bind:checked={env.DoHBehindProxy}
		>
		<span class="suffix">
			Yes
		</span>
	</div>

	<LabelHint
		target="PruneDelay"
		title="Prune delay"
		info="Delay for pruning caches.
Every N seconds, rescached will traverse all caches and remove response that
has not been accessed less than cache.prune_threshold.
Its value must be equal or greater than 1 hour (3600 seconds).
"
	></LabelHint>
	<InputNumber
		min=3600
		max=36000
		bind:val={env.PruneDelay}
		unit="Seconds"
	></InputNumber>

	<LabelHint
		target="PruneThreshold"
		title="Prune threshold"
		info="The duration when the cache will be considered expired.
Its value must be negative and greater or equal than -1 hour (-3600 seconds)."
	></LabelHint>
	<InputNumber
		min=-36000
		max=-3600
		bind:val={env.PruneThreshold}
		unit="Seconds"
	></InputNumber>
</div>

<div>
	<button on:click={updateEnvironment}>
		Save
	</button>
</div>
</div>
