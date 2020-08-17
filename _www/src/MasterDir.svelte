<script>
	import { onDestroy } from 'svelte';
	import { environment, nanoSeconds, setEnvironment } from './environment.js';

	const apiMasterd = "/api/master.d/"

	let env = {
		NameServers: [],
		HostsBlocks: [],
		HostsFiles: [],
		MasterFiles: {},
	};
	let newMasterFile = "";
	let activeMF = {
		Name: "",
	};

	let RRTypes = {
		1: 'A',
		2: 'NS',
		5: 'CNAME',
		6: 'SOA',
		12: 'PTR',
		15: 'MX',
		16: 'TXT',
		28: 'AAAA',
	};

	let rr = newRR()
	let rrSOA = newSOA();
	let rrMX = newMX();

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});
	onDestroy(envUnsubscribe);

	function createMasterFile() {
	}

	function deleteMasterFile() {
	}

	function onSelectRRType() {
		switch (rr.Type) {
		case 6:
			rrSOA = newSOA()
			break
		case 15:
			rrMX = newMX()
			break
		}
	}

	async function handleCreateRR() {
		switch (rr.Type) {
		case 6:
			rr.Value = rrSOA;
			break;
		case 15:
			rr.Value = rrMX;
			break;
		}

		let api = apiMasterd+ activeMF.Name +"/rr/"+ rr.Type;
		const res = await fetch(api, {
			method: "POST",
			headers: {
      			'Content-Type': 'application/json',
			},
			body: JSON.stringify(rr),
		})

		if (res.status >= 400) {
			console.log("handleCreateRR: ", res.status, res.statusText);
			return;
		}

		let newRR = await res.json()

		let listRR = activeMF.Records[newRR.Name]
		if (typeof listRR === "undefined") {
			listRR = [];
		}
		listRR.push(newRR);
		activeMF.Records[newRR.Name] = listRR

		console.log("handleCreateRR:", newRR);
	}

	async function handleDeleteRR(rr, idx) {
		let api = apiMasterd + activeMF.Name +"/rr/"+ rr.Type

		const res = await fetch(api, {
			method: "DELETE",
			headers: {
      			'Content-Type': 'application/json',
			},
			body: JSON.stringify(rr),
		})

		if (res.status >= 400) {
			console.log("handleCreateRR: ", res.status, res.statusText)
			return
		}

		let listRR = activeMF.Records[rr.Name]
		listRR.splice(idx, 1)
		activeMF.Records[rr.Name] = listRR

		let resbody = await res.json()

		console.log("response body:", resbody)
	}

	function getTypeName(k) {
		let v = RRTypes[k];
		if (v === "") {
			return k;
		}
		return v;
	}

	function newRR() {
		return {
			Name: "",
			Type: 1,
			Value: "",
		};
	}

	function newMX() {
		return {
			Preference: 1,
			Exchange: "",
		}
	}

	function newSOA() {
		return {
			MName: "",
			RName: "",
			Serial: 0,
			Refresh: 0,
			Retry: 0,
			Expire: 0,
			Minimum: 0
		};
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
		cursor: pointer;
		color: rgb(0, 100, 200);
	}
	.content {
		float: left;
	}

	form {
		margin: 1em 0px;
		padding: 10px 10px 0px 10px;
		border: 1px solid silver;
	}
	form > label > span {
		width: 7em;
		display: inline-block;
	}
	form > label > input {
		width: calc(100% - 8em);
	}
	form > label > input.name {
		width: 12em;
	}
	form > div.actions {
		border-top: 1px solid silver;
		margin-top: 10px;
		padding: 10px;
	}

	.rr {
		font-family: monospace;
		width: 100%;
		padding: 1em 0px;
	}
	.rr.header {
		font-weight: bold;
	}
	.rr > .name {
		width: 20em;
		display: inline-block;
	}
	.rr > .type {
		width: 4em;
		display: inline-block;
	}
	.rr > .ttl {
		width: 6em;
		display: inline-block;
	}
	.rr > .value {
		display: inline-block;
	}
</style>

<div class="master_d">
	<h2> / master.d </h2>

	<div class="nav-left">
{#each Object.entries(env.MasterFiles) as [name, mf]}
		<div class="item">
			<span on:click={()=>activeMF = mf}>
				{mf.Name}
			</span>
		</div>
{/each}
		<br/>

		<label>
			<span>New master file:</span>
			<br/>
			<input bind:value={newMasterFile}>
		</label>
		<button on:click={createMasterFile}>
			Create
		</button>
	</div>

	<div class="content">
{#if activeMF.Name === ""}
		<p>
			Select one of the master file to manage.
		</p>
{:else}
		<p>
			{activeMF.Name}
			<button on:click={deleteMasterFile}>
				Delete
			</button>
		</p>

		<div class="rr header">
			<span class="name">
				Name
			</span>
			<span class="type">
				Type
			</span>
			<span class="value">
				Value
			</span>
		</div>

	{#each Object.entries(activeMF.Records) as [dname, listRR]}
		{#each listRR as rr, idx}
		<div class="rr">
			<span class="name">
				{rr.Name}
			</span>
			<span class="type">
				{getTypeName(rr.Type)}
			</span>
			<span class="value">
				{rr.Value}
			</span>
			<button on:click={handleDeleteRR(rr, idx)}>
				X
			</button>
		</div>
		{/each}
	{/each}

		<form on:submit|preventDefault={handleCreateRR}>
			<label>
				<span>
					Name:
				</span>
				<input class="name" bind:value={rr.Name}>
				.{activeMF.Name}
			</label>
			<label>
				<span>
					Type:
				</span>
				<select
					bind:value={rr.Type}
					on:blur={onSelectRRType}
				>
	{#each Object.entries(RRTypes) as [k, v]}
					<option value={parseInt(k)}>
						{v}
					</option>
	{/each}
				</select>
			</label>

	{#if rr.Type === 1 || rr.Type === 2 || rr.Type === 5 ||
		rr.Type === 12 || rr.Type === 16 || rr.Type === 28
	}
			<label>
				<span>
					Value:
				</span>
				<input bind:value={rr.Value}>
			</label>
	{:else if rr.Type === 6}
			<label>
				<span>
					Name server:
				</span>
				<input bind:value={rrSOA.MName}>
			</label>
			<label>
				<span>
					Admin email:
				</span>
				<input bind:value={rrSOA.RName}>
			</label>
			<label>
				<span>
					Serial:
				</span>
				<input bind:value={rrSOA.Serial} type=number>
			</label>
			<label>
				<span>
					Refresh:
				</span>
				<input bind:value={rrSOA.Refresh} type=number>
			</label>
			<label>
				<span>
					Retry:
				</span>
				<input bind:value={rrSOA.Retry} type=number>
			</label>
			<label>
				<span>
					Expire:
				</span>
				<input bind:value={rrSOA.Expire} type=number>
			</label>
			<label>
				<span>
					Minimum:
				</span>
				<input bind:value={rrSOA.Minimum} type=number>
			</label>
	{:else if rr.Type === 15}
			<label>
				<span>
					Preference:
				</span>
				<input bind:value={rrMX.Preference} type=number min=1 max=65535>
			</label>
			<label>
				<span>
					Exchange:
				</span>
				<input bind:value={rrMX.Exchange}>
			</label>
	{/if}
			<div class="actions">
				<button class="create" type=submit>
					Create
				</button>
			</div>
		</form>
{/if}
	</div>
</div>
