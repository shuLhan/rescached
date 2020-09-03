<script>
	import { onDestroy } from 'svelte';
	import { WuiPushNotif, WuiLabelHint } from 'wui.svelte';
	import { environment, nanoSeconds, setEnvironment } from './environment.js';

	const apiMasterd = "/api/master.d/"

	let env = {
		NameServers: [],
		HostsBlocks: [],
		HostsFiles: [],
		ZoneFiles: {},
	};
	let newMasterFile = "";
	let activeZone = {
		Name: "",
	};

	let RRTypes = {
		1: 'A',
		2: 'NS',
		5: 'CNAME',
		12: 'PTR',
		15: 'MX',
		16: 'TXT',
		28: 'AAAA',
	};

	let rr = newRR()
	let rrMX = newMX();

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});
	onDestroy(envUnsubscribe);

	function setActiveZone(zone) {
		if (zone.SOA === null) {
			zone.SOA = newSOA()
		}
		activeZone = zone
	}

	async function handleMasterFileCreate() {
		let api = apiMasterd + newMasterFile
		const res = await fetch(api, {
			method: "PUT",
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleCreateRR: "+ resError.message)
			return;
		}

		activeZone = await res.json()
		env.ZoneFiles[activeZone.Name] = activeZone

		WuiPushNotif.Info("The new zone file '"+ newMasterFile + "' has been created")
	}

	async function handleMasterFileDelete() {
		let api = apiMasterd + activeZone.Name
		const res = await fetch(api, {
			method: "DELETE",
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleCreateRR: "+ resError.message)
			return;
		}

		WuiPushNotif.Info("The zone file '"+ activeZone.Name + "' has beed deleted")

		delete env.ZoneFiles[activeZone.Name]
		activeZone = {
			Name: "",
		}
		env.ZoneFiles = env.ZoneFiles

	}

	function onSelectRRType() {
		switch (rr.Type) {
		case 15:
			rrMX = newMX()
			break
		}
	}

	async function handleSOADelete() {
		return handleDeleteRR(activeZone.SOA, -1)
	}

	async function handleSOASave() {
		rr = activeZone.SOA
		return handleCreateRR()
	}

	async function handleCreateRR() {
		if (rr.Type === 15) {
			rr.Value = rrMX;
		}

		let api = apiMasterd+ activeZone.Name +"/rr/"+ rr.Type;
		const res = await fetch(api, {
			method: "POST",
			headers: {
      			'Content-Type': 'application/json',
			},
			body: JSON.stringify(rr),
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleCreateRR: "+ resError.message)
			return;
		}

		let newRR = await res.json()

		if (newRR.Type === 6) {
			activeZone.SOA = newRR
			WuiPushNotif.Info("SOA record has been saved")
		} else {
			let listRR = activeZone.Records[newRR.Name]
			if (typeof listRR === "undefined") {
				listRR = [];
			}
			listRR.push(newRR);
			activeZone.Records[newRR.Name] = listRR
			WuiPushNotif.Info("The new record '"+ newRR.Name +"' has been created")
		}
	}

	async function handleDeleteRR(rr, idx) {
		let api = apiMasterd + activeZone.Name +"/rr/"+ rr.Type

		const res = await fetch(api, {
			method: "DELETE",
			headers: {
      			'Content-Type': 'application/json',
			},
			body: JSON.stringify(rr),
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleDeleteRR: "+ resError.message)
			return
		}

		WuiPushNotif.Info("The record '"+ rr.Name +"' has been deleted")

		if (rr.Type == 6) { // SOA.
			activeZone.SOA = newSOA()
		} else {
			let listRR = activeZone.Records[rr.Name]
			listRR.splice(idx, 1)
			activeZone.Records[rr.Name] = listRR
		}

		let resbody = await res.json()
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
			Name: "",
			Type: 6,
			Value: {
				MName: "",
				RName: "",
				Serial: 0,
				Refresh: 0,
				Retry: 0,
				Expire: 0,
				Minimum: 0
			}
		};
	}
</script>

<style>
	h4 {
		border-bottom: 1px solid silver;
	}
	.nav-left {
		padding: 0px;
		width: 280px;
		float: left;
	}
	.nav-left .item {
		margin: 4px 0px;
		cursor: pointer;
		color: rgb(0, 100, 200);
	}
	.content {
		float: left;
		width: calc(100% - 300px);
	}
	.action-delete {
		margin-left: 1em;
	}
	.actions {
		padding: 1em;
	}
	.actions button {
		width: 100%;
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
	<div class="nav-left">
{#each Object.entries(env.ZoneFiles) as [name, mf]}
		<div class="item">
			<span on:click={setActiveZone(mf)}>
				{mf.Name}
			</span>
		</div>
{/each}
		<br/>

		<label>
			<span>New zone file:</span>
			<br/>
			<input bind:value={newMasterFile}>
		</label>
		<button on:click={handleMasterFileCreate}>
			Create
		</button>
	</div>

	<div class="content">
{#if activeZone.Name === ""}
		<p>
			Select one of the zone file to manage.
		</p>
{:else}
		<h3>
			{activeZone.Name}
			<button
				class="action-delete"
				on:click={handleMasterFileDelete}
			>
				Delete
			</button>
		</h3>

		<h4>
			SOA record
			<button
				class="action-delete"
				on:click={handleSOADelete}
			>
				Delete
			</button>
		</h4>
		<div class="rr-soa">
			<WuiLabelHint
				title="Name server"
				title_width="150px"
				info="The domain-name of the name server that was the
                original or primary source of data for this zone"
			>
				<input bind:value={activeZone.SOA.Value.MName}>
			</WuiLabelHint>
			<WuiLabelHint
				title="Admin email"
				title_width="150px"
				info="A domain-name which specifies the mailbox of the
                person responsible for this zone."
			>
				<input bind:value={activeZone.SOA.Value.RName}>
			</WuiLabelHint>
			<WuiLabelHint
				title="Serial"
				title_width="150px"
				info="The version number of the original copy
                of the zone.  Zone transfers preserve this value.  This
                value wraps and should be compared using sequence space
                arithmetic."
			>
				<input
					bind:value={activeZone.SOA.Value.Serial}
					type=number
					min=0
				>
			</WuiLabelHint>
			<WuiLabelHint
				title="Refresh"
				title_width="150px"
				info="A time interval before the zone should be refreshed."
			>
				<input
					bind:value={activeZone.SOA.Value.Refresh}
					type=number
					min=0
				>
			</WuiLabelHint>
			<WuiLabelHint
				title="Retry"
				title_width="150px"
				info="A time interval that should elapse before a
                failed refresh should be retried."
			>
				<input
					bind:value={activeZone.SOA.Value.Retry}
					type=number
					min=0
				>
			</WuiLabelHint>
			<WuiLabelHint
				title="Expire"
				title_width="150px"
				info="A 32 bit time value that specifies the upper limit on
                the time interval that can elapse before the zone is no
                longer authoritative."
			>
				<input
					bind:value={activeZone.SOA.Value.Expire}
					type=number
					min=0
				>
			</WuiLabelHint>
			<WuiLabelHint
				title="Minimum"
				title_width="150px"
				info="The unsigned 32 bit minimum TTL field that should be
                exported with any RR from this zone."
			>
				<input
					bind:value={activeZone.SOA.Value.Minimum}
					type=number
					min=0
				>
			</WuiLabelHint>
			<div class="actions">
				<button on:click={handleSOASave}>
					Save
				</button>
			</div>
		</div>

		<h4> List records </h4>
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

	{#each Object.entries(activeZone.Records) as [dname, listRR]}
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
				.{activeZone.Name}
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
		rr.Type === 16 || rr.Type === 28
	}
			<label>
				<span>
					Value:
				</span>
				<input bind:value={rr.Value}>
			</label>
	{:else if rr.Type === 12}
			<label>
				<span>
					Value:
				</span>
				<input bind:value={rr.Value}>
				<p>
					For PTR record, the name will become a value, and the
					value will become a name.
				</p>
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
