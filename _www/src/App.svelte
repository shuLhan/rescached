<script>
	import { onMount } from 'svelte';
	import { WuiNotif, WuiPushNotif } from 'wui.svelte';

	import { apiEnvironment, environment, nanoSeconds, setEnvironment } from './environment.js';
	import Environment from './Environment.svelte';
	import HostsBlock from './HostsBlock.svelte';
	import HostsDir from './HostsDir.svelte';
	import MasterDir from './MasterDir.svelte';

	const stateHostsBlock = "hosts_block";
	const stateHostsDir = "hosts_d";
	const stateMasterDir = "master_d";

	let state;
	let env = {
		NameServers: [],
		HostsBlocks: [],
		HostsFiles: {},
	};

	onMount(async () => {
		const res = await fetch(apiEnvironment);
		if (res.status >= 400) {
			WuiPushNotif.Error("ERROR: {apiEnvironment}: ",
				res.status, res.statusText);
			return;
		}

		setEnvironment(await res.json());
 		state = window.location.hash.slice(1);
	});
</script>

<style>
	div.main {
		margin: 0 auto;
		width: 800px;
		padding: 0px 1em;
	}
	nav.menu {
		color: #ff3e00;
		text-transform: uppercase;
		font-weight: 100;
		margin-bottom: 2em;
	}
	.active {
		padding-bottom: 4px;
		border-bottom: 4px solid #ff3e00;
	}
	@media (max-width: 900px) {
		div.main {
			width: calc(100% - 2em);
		}
	}
</style>

<WuiNotif timeout=3000 />

<div class="main">
	<nav class="menu">
		<a
			href="#home"
			on:click={()=>state=""}
			class:active="{state===''||state==='home'}"
		>
			rescached
		</a>
		/
		<a
			href="#{stateHostsBlock}"
			on:click={()=>state=stateHostsBlock}
			class:active="{state===stateHostsBlock}"
		>
			Hosts blocks
		</a>
		/
		<a
			href="#{stateHostsDir}"
			on:click={()=>state=stateHostsDir}
			class:active="{state === stateHostsDir}"
		>
			hosts.d
		</a>
		/
		<a
			href="#{stateMasterDir}"
			on:click={()=>state=stateMasterDir}
			class:active="{state === stateMasterDir}"
		>
			master.d
		</a>
	</nav>

	{#if state === stateHostsBlock}
		<HostsBlock/>
	{:else if state === stateHostsDir}
		<HostsDir/>
	{:else if state === stateMasterDir}
		<MasterDir/>
	{:else}
		<Environment/>
	{/if}
</div>
