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
	let newZoneFile = "";
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

	let _rr = newRR()
	let _rrMX = newMX();

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

	async function handleZoneFileCreate() {
		const res = await fetch(apiMasterd + newZoneFile, {
			method: "PUT",
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleZoneFileCreate: "+ resError.message)
			return;
		}

		activeZone = await res.json()
		activeZone.SOA = newSOA()
		env.ZoneFiles[activeZone.Name] = activeZone

		WuiPushNotif.Info("The new zone file '"+ newZoneFile +"' has been created")
	}

	async function handleZoneFileDelete() {
		let api = apiMasterd + activeZone.Name
		const res = await fetch(api, {
			method: "DELETE",
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleZoneFileDelete: "+ resError.message)
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
		switch (_rr.Type) {
		case 15:
			_rrMX = newMX()
			break
		}
	}

	async function handleSOADelete() {
		return handleDeleteRR(activeZone.SOA, -1)
	}

	async function handleSOASave() {
		_rr = activeZone.SOA
		return handleCreateRR()
	}

	async function handleCreateRR() {
		switch (_rr.Type) {
		case 15:
			_rr.Value = _rrMX;
			break;
		}

		let api = apiMasterd + activeZone.Name +"/rr/"+ _rr.Type;
		const res = await fetch(api, {
			method: "POST",
			headers: {
      			'Content-Type': 'application/json',
			},
			body: JSON.stringify(_rr),
		})

		if (res.status >= 400) {
			const resError = await res.json()
			WuiPushNotif.Error("ERROR: handleCreateRR: "+ resError.message)
			return;
		}

		let resRR = await res.json()

		if (resRR.Type === 6) {
			activeZone.SOA = resRR
			WuiPushNotif.Info("SOA record has been saved")
		} else {
			let listRR = activeZone.Records[resRR.Name]
			if (typeof listRR === "undefined") {
				listRR = [];
			}
			listRR.push(resRR);
			activeZone.Records[resRR.Name] = listRR
			WuiPushNotif.Info("The new record '"+ resRR.Name +"' has been created")
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
		word-wrap: break-word;
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
		word-wrap: break-word;
	}
</style>

<div class="master_d">
	<div class="nav-left">
		{#each Object.entries(env.ZoneFiles) as [name, zoneFile]}
			<div class="item">
				<span on:click={setActiveZone(zoneFile)}>
					{zoneFile.Name}
				</span>
			</div>
		{/each}
		<br/>

		<label>
			<span>New zone file:</span>
			<br/>
			<input bind:value={newZoneFile}>
		</label>
		<button on:click={handleZoneFileCreate}>
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
					on:click={handleZoneFileDelete}
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
original or primary source of data for this zone.
It should be domain-name where the rescached run."
				>
					<input bind:value={activeZone.SOA.Value.MName}>
				</WuiLabelHint>
				<WuiLabelHint
					title="Admin email"
					title_width="150px"
					info='Email address of the administrator responsible for
this zone.
The "@" on email address is replaced with dot, and if there is a dot before
"@" it should be escaped with "\".
For example, "dns.admin@domain.tld" would be written as
"dns\.admin.domain.tld".'
				>
					<input bind:value={activeZone.SOA.Value.RName}>
				</WuiLabelHint>
				<WuiLabelHint
					title="Serial"
					title_width="150px"
					info="Serial number for this zone. If a secondary name
server observes an increase in this number, the server will assume that the
zone has been updated and initiate a zone transfer."
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
					info="Number of seconds after which secondary name servers
should query the master for the SOA record, to detect zone changes.
Recommendation for small and stable zones is 86400 seconds (24 hours)."
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
					info="Number of seconds after which secondary name servers
should retry to request the serial number from the master if the master does
not respond.
It must be less than Refresh.
Recommendation for small and stable zones is 7200 seconds (2 hours)."
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
					info="Number of seconds after which secondary name servers
should stop answering request for this zone if the master does not respond.
This value must be bigger than the sum of Refresh and Retry.
Recommendation for small and stable zones is 3600000 seconds (1000 hours)."
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
					info="Time to live for purposes of negative caching.
Recommendation for small and stable zones is 1800 seconds (30 min)."
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
						Type:
					</span>
					<select
						bind:value={_rr.Type}
						on:blur={onSelectRRType}
					>
						{#each Object.entries(RRTypes) as [k, v]}
							<option value={parseInt(k)}>
								{v}
							</option>
						{/each}
					</select>
				</label>

				{#if _rr.Type === 1 || _rr.Type === 2 || _rr.Type === 5 ||
					_rr.Type === 16 || _rr.Type === 28
				}
					<label>
						<span>
							Name:
						</span>
						<input class="name" bind:value={_rr.Name}>
						.{activeZone.Name}
					</label>

					<label>
						<span>
							Value:
						</span>
						<input bind:value={_rr.Value}>
					</label>
				{:else if _rr.Type === 12} <!-- PTR -->
					<label>
						<span>
							Name:
						</span>
						<input bind:value={_rr.Name}>
					</label>
					<label>
						<span>
							Value:
						</span>
						<input class="name" bind:value={_rr.Value}>
						.{activeZone.Name}
					</label>
				{:else if _rr.Type === 15} <!-- MX -->
					<label>
						<span>
							Name:
						</span>
						<input class="name" bind:value={_rr.Name}>
						.{activeZone.Name}
					</label>
					<label>
						<span>
							Preference:
						</span>
						<input bind:value={_rrMX.Preference} type=number min=1 max=65535>
					</label>
					<label>
						<span>
							Exchange:
						</span>
						<input bind:value={_rrMX.Exchange}>
					</label>
				{/if}

				<div class="actions">
					<button class="create" type=submit>
						Create
					</button>
				</div>
			</form>
		{/if}
	</div> <!-- content -->
</div> <!-- master_d -->
