<script>
	import { onDestroy } from 'svelte';

	import { apiEnvironment, environment, nanoSeconds } from './environment.js';
	import { WuiPushNotif } from "wui.svelte";
	import { WuiLabelHint, WuiInputNumber, WuiInputIPPort } from "wui.svelte";

	let env = {
		NameServers: [],
		HostsBlocks: [],
		HostsFiles: {},
	};

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});

	onDestroy(envUnsubscribe);

	const defTitleWidth = "300px";

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
		environment.set(env)

		got.PruneDelay = got.PruneDelay * nanoSeconds;
		got.PruneThreshold = got.PruneThreshold * nanoSeconds;

		const res = await fetch(apiEnvironment, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(got),
		});

		if (res.status >= 400) {
			const resbody = await res.json()
			WuiPushNotif.Error("ERROR: ", resbody.message)
			return;
		}

		WuiPushNotif.Info("The environment succesfully updated ...")
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
		max-width: calc(100% - 100px);
	}
	.input-deletable > button {
		width: 80px;
	}
	.input-checkbox {
		width: 100%;
	}
	.input-checkbox input[type="checkbox"] {
		width: auto;
	}
	.section-bottom {
		margin: 2em 0px 0px 0px;
		padding: 1em;
		border-top: 1px solid black;
	}
</style>

<div class="environment">
<p>
This page allow you to change the rescached environment.
Upon save, the rescached service will be restarted.
</p>

<h3>rescached</h3>
<div>
	<WuiLabelHint
		title="System resolv.conf"
		title_width="{defTitleWidth}"
		info="A path to dynamically generated resolv.conf(5) by
resolvconf(8).  If set, the nameserver values in referenced file will
replace 'parent' value and 'parent' will become a fallback in
case the referenced file being deleted or can not be parsed."
	>
		<input
			bind:value={env.FileResolvConf}
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="Debug level"
		title_width="{defTitleWidth}"
		info="This option only used for debugging program or if user
want to monitor what kind of traffic goes in and out of rescached."
	>
		<WuiInputNumber
			min=0
			max=3
			bind:value={env.Debug}
			unit=""
		/>
	</WuiLabelHint>
</div>

<h3>DNS server</h3>
<div>
	<WuiLabelHint
		title="Parent name servers"
		title_width="{defTitleWidth}"
		info="List of parent DNS servers."
	>
	</WuiLabelHint>

	{#each env.NameServers as ns}
	<div class="input-deletable">
		<input bind:value={ns}>
		<button on:click={deleteNameServer(ns)}>
			Delete
		</button>
	</div>
	{/each}

	<button
		on:click={addNameServer}
	>
		Add
	</button>

	<WuiLabelHint
		title="Listen address"
		title_width="{defTitleWidth}"
		info="Address in local network where rescached will
listening for query from client through UDP and TCP.
<br/>
If you want rescached to serve a query from another host in your local
network, change this value to <tt>0.0.0.0:53</tt>."
	>
		<WuiInputIPPort
			bind:value={env.ListenAddress}
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="HTTP listen port"
		title_width="{defTitleWidth}"
		info="Port to serve DNS over HTTP"
	>
		<WuiInputNumber
			min=0
			max=65535
			bind:value={env.HTTPPort}
			unit=""
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="TLS listen port"
		title_width="{defTitleWidth}"
		info="Port to listen for DNS over TLS"
	>
		<WuiInputNumber
			min=0
			max=65535
			bind:value={env.TLSPort}
			unit=""
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="TLS certificate"
		title_width="{defTitleWidth}"
		info="Path to certificate file to serve DNS over TLS and
HTTPS">
		<input
			placeholder="/path/to/certificate"
			bind:value={env.TLSCertFile}
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="TLS private key"
		title_width="{defTitleWidth}"
		info="Path to certificate private key file to serve DNS over TLS and
HTTPS."
	>
		<input
			placeholder="/path/to/certificate/private.key"
			bind:value={env.TLSPrivateKey}
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="TLS allow insecure"
		title_width="{defTitleWidth}"
		info="If its true, allow serving DoH and DoT with self signed
certificate."
	>
		<div class="input-checkbox">
			<input
				type=checkbox
				bind:checked={env.TLSAllowInsecure}
			>
			<span class="suffix">
				Yes
			</span>
		</div>
	</WuiLabelHint>

	<WuiLabelHint
		title="DoH behind proxy"
		title_width="{defTitleWidth}"
		info="If its true, serve DNS over HTTP only, even if
certificate files is defined.
This allow serving DNS request forwarded by another proxy server."
	>
		<div class="input-checkbox">
			<input
				type=checkbox
				bind:checked={env.DoHBehindProxy}
			>
			<span class="suffix">
				Yes
			</span>
		</div>
	</WuiLabelHint>

	<WuiLabelHint
		title="Prune delay"
		title_width="{defTitleWidth}"
		info="Delay for pruning caches.
Every N seconds, rescached will traverse all caches and remove response that
has not been accessed less than cache.prune_threshold.
Its value must be equal or greater than 1 hour (3600 seconds).
"
	>
		<WuiInputNumber
			min=3600
			max=36000
			bind:value={env.PruneDelay}
			unit="seconds"
		/>
	</WuiLabelHint>

	<WuiLabelHint
		title="Prune threshold"
		title_width="{defTitleWidth}"
		info="The duration when the cache will be considered expired.
Its value must be negative and greater or equal than -1 hour (-3600 seconds)."
	>
		<WuiInputNumber
			min=-36000
			max=-3600
			bind:value={env.PruneThreshold}
			unit="seconds"
		/>
	</WuiLabelHint>
</div>

	<div class="section-bottom">
		<div>
			<button on:click={updateEnvironment}>
				Save
			</button>
		</div>
	</div>
</div>
