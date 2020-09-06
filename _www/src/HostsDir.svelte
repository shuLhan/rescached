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
	let newRecord = null;
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

	function addRecord() {
		if (newRecord !== null) {
			return
		}
		newRecord = {
			Name: "",
			Value: "",
		}
	}

	async function handleHostsRecordCreate() {
		const api = apiHostsDir +"/"+ hostsFile.Name +"/rr"
			+"?domain="+ newRecord.Name
			+"&value="+ newRecord.Value

		const res = await fetch(api, {
			method: "POST"
		})
		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: "+ resError.message)
			return;
		}
		const rr = await res.json()
		hostsFile.Records.push(rr)
		hostsFile.Records = hostsFile.Records
		newRecord = null
		WuiPushNotif.Info("Record '"+ rr.Name +"' has been created")
	}

	async function handleHostsRecordDelete(rr, idx) {
		const api = apiHostsDir +"/"+ hostsFile.Name +"/rr"+
			"?domain="+rr.Name

		const res = await fetch(api, {
			method: "DELETE"
		})
		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: "+ resError.message)
			return;
		}
		hostsFile.Records.splice(idx, 1);
		hostsFile.Records = hostsFile.Records;
		WuiPushNotif.Info("Record '"+ rr.Name +"' has been deleted")
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
		width: 280px;
		float: left;
	}
	.nav-left .item {
		margin: 4px 0px;
	}
	.content {
		float: left;
		width: calc(100% - 300px);
	}
	.host {
		font-family: monospace;
		width: 100%;
	}
	.host.header {
		margin: 1em 0px;
		font-weight: bold;
		border-bottom: 1px solid silver;
	}
	.host_name {
		display: inline-block;
		width: 240px;
		word-wrap: break-word;
	}
	.host_value {
		display: inline-block;
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
				<button on:click={addRecord}>
					Add
				</button>
			</div>

			{#if newRecord !== null}
				<div class="host">
					<input
						class="host_name"
						placeholder="Domain name"
						bind:value={newRecord.Name}
					>
					<input
						class="host_value"
						placeholder="IP address"
						bind:value={newRecord.Value}
					>
					<button on:click={handleHostsRecordCreate}>
						Create
					</button>
				</div>
			{/if}

			<div class="host header">
				<span class="host_name"> Domain name </span>
				<span class="host_value"> IP address </span>
			</div>

			{#each hostsFile.Records as rr, idx (idx)}
				<div class="host">
					<span class="host_name"> {rr.Name} </span>
					<span class="host_value"> {rr.Value} </span>
					<button on:click={handleHostsRecordDelete(rr, idx)}>
						X
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
