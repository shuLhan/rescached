<script> import { onDestroy } from 'svelte';
	import { WuiPushNotif } from 'wui.svelte';
	import { apiEnvironment, environment, nanoSeconds } from './environment.js';

	const apiHostsDir = "/api/hosts.d"
	let env = {
		HostsFiles: {},
	};
	let hostsFile = {
		Name: "",
		Records: [],
	};
	let newHostsFile = "";

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});
	onDestroy(envUnsubscribe);

	async function getHostsFile(hf) {
		if (hf.Records === null) {
			hf.Records = []
		}
		if (hf.Records.length > 0) {
			hostsFile = hf;
			return;
		}
		const res = await fetch(apiHostsDir +"/"+ hf.Name);
		hf.Records = await res.json();
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
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: createHostsFile: ", resError.message)
			return;
		}

		const hf = {
			Name: newHostsFile,
			Records: [],
		}
		env.HostsFiles[newHostsFile] = hf
		env = env

		WuiPushNotif.Info("The new host file '"+ newHostsFile +"' has been created")
	}

	async function updateHostsFile() {
		const res = await fetch(apiHostsDir+"/"+ hostsFile.Name, {
			method: "POST",
			body: JSON.stringify(hostsFile.Records),
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: updateHostsFile: ", resError.message)
			return;
		}

		hostsFile.Records = await res.json()

		WuiPushNotif.Info("The host file '"+ hostsFile.Name +"' has been updated")
	}

	function addHost() {
		let newHost = {
			Name: "",
			Value: "",
		}
		hostsFile.Records.unshift(newHost);
		hostsFile.Records = hostsFile.Records;
	}

	function deleteHost(idx) {
		hostsFile.Records.splice(idx, 1);
		hostsFile.Records = hostsFile.Records;
	}

	async function deleteHostsFile(hfile) {
		const res = await fetch(apiHostsDir+"/"+hfile.Name, {
			method: "DELETE",
		});
		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: deleteHostsFile: ", resError.message)
			return;
		}
		delete env.HostsFiles[hfile.Name]
		env = env;
		hostsFile = {
			Name: "",
			Records: [],
		}
		WuiPushNotif.Info("The host file '"+ hfile.Name +"' has been deleted")
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
		{#each Object.entries(env.HostsFiles) as [name,hf], name }
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
		<div>
			Select one of the hosts file to manage.
		</div>
		{:else}
		<p>
			{hostsFile.Name} ({hostsFile.Records.length} records)
			<button on:click={deleteHostsFile(hostsFile)}>
				Delete
			</button>
		</p>
		<div>
			<button on:click={addHost}>
				Add
			</button>
		</div>

		{#each hostsFile.Records as host, idx (idx)}
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
