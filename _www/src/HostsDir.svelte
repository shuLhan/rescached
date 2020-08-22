<script>
	import { onDestroy } from 'svelte';
	import { WuiPushNotif } from 'wui.svelte';
	import { apiEnvironment, environment, nanoSeconds } from './environment.js';

	const apiHostsDir = "/api/hosts.d"
	let env = {
		HostsFiles: [],
	};
	let hostsFile = {
		Name: "",
		hosts: [],
	};
	let newHostsFile = "";

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});
	onDestroy(envUnsubscribe);

	async function getHostsFile(hf) {
		if (hf.hosts.length > 0) {
			hostsFile = hf;
			return;
		}
		const res = await fetch(apiHostsDir +"/"+ hf.Name);
		hf.hosts = await res.json();
		hostsFile = hf;
	}

	async function createHostsFile() {
		if (newHostsFile === "") {
			return;
		}

		const res = await fetch(apiHostsDir+ "/"+ newHostsFile, {
			method: "PUT",
		})

		if (res.status >= 400) {
			WuiPushNotif.Error("ERROR: createHostsFile: ", res.status,
				res.statusText);
			return;
		}

		const hf = {
			Name: newHostsFile,
			Path: newHostsFile,
			hosts: [],
		}
		env.HostsFiles.push(hf);
		env.HostsFiles = env.HostsFiles;
	}

	async function updateHostsFile() {
		const res = await fetch(apiHostsDir+"/"+ hostsFile.Name, {
			method: "POST",
			body: JSON.stringify(hostsFile.hosts),
		})

		if (res.status >= 400) {
			WuiPushNotif.Error("ERROR: updateHostsFile: ", res.status,
				res.statusText);
			return;
		}

		hostsFile.hosts = await res.json()
	}

	function addHost() {
		let newHost = {
			Name: "",
			Value: "",
		}
		hostsFile.hosts.unshift(newHost);
		hostsFile.hosts = hostsFile.hosts;
	}

	function deleteHost(idx) {
		hostsFile.hosts.splice(idx, 1);
		hostsFile.hosts = hostsFile.hosts;
	}

	async function deleteHostsFile(hfile) {
		const res = await fetch(apiHostsDir+"/"+hfile.Name, {
			method: "DELETE",
		});
		if (res.status >= 400) {
			WuiPushNotif.Error("ERROR: deleteHostsFile: ", res.status,
				res.statusText);
			return;
		}
		for (let x = 0; x < env.HostsFiles.length; x++) {
			if (env.HostsFiles[x].Name == hfile.Name) {
				hostsFile = {Name: "", Path:"", hosts: []};
				env.HostsFiles.splice(x, 1);
				env.HostsFiles = env.HostsFiles;
				return
			}
		}
	}
</script>

<style>
	.nav-left {
		padding: 0px;
		width: 300px;
		float: left;
	}
	.nav-left .item {
		margin: 4px 0px;
	}
	.content {
		float: left;
	}
	.host {
		font-family: monospace;
		width: 100%;
	}
	input.host_name {
		min-width: 240px;
		width: calc(100% - 180px);
	}
	input.host_value {
		width: 140px;
	}
</style>

<div class="hosts_d">
	<div class="nav-left">
		{#each env.HostsFiles as hf}
		<div class="item">
			<a href="#" on:click={getHostsFile(hf)}>
				{hf.Name}
			</a>
		</div>
		{/each}

		<br/>

		<label>
			<span>New hosts file:</span>
			<br/>
			<input bind:value={newHostsFile}>
		</label>
		<button on:click={createHostsFile}>
			Create
		</button>
	</div>

	<div class="content">
		{#if hostsFile.Name === ""}
		<p>
			Select one of the hosts file to manage.
		</p>
		{:else}
		<p>
			{hostsFile.Name} ({hostsFile.hosts.length} records)
			<button on:click={deleteHostsFile(hostsFile)}>
				Delete
			</button>
		</p>
		<div>
			<button on:click={addHost}>
				Add
			</button>
		</div>

		{#each hostsFile.hosts as host, idx (idx)}
		<div class="host">
			<input
				class="host_name"
				placeholder="Domain name"
				bind:value={host.Name}
			>
			<input
				class="host_value"
				placeholder="IP address"
				bind:value={host.Value}
			>
			<button on:click={deleteHost(idx)}>
				X
			</button>
		</div>
		{/each}

		<button on:click={updateHostsFile}>
			Save
		</button>
		{/if}
	</div>
</div>
