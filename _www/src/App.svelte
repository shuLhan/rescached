<script>
	import { onMount } from 'svelte';

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
		HostsFiles: [],
	};

	onMount(async () => {
		const res = await fetch(apiEnvironment);
		if (res.status >= 400) {
			console.log("onMount: ", res.status, res.statusText);
			return;
		}

		setEnvironment(await res.json());
 		state = window.location.hash.slice(1);
		console.log('state:', state);
	});
</script>

<style>
	div.main {
		padding: 0px 1em;
	}
	nav.menu {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: normal;
		font-weight: 100;
	}

	@media (max-width: 640px) {
		div.main {
			max-width: none;
		}
	}
</style>

<div class="main">
	<nav class="menu">
		<a href="#home" on:click={()=>state=""}>
			rescached
		</a>
		/
		<a href="#{stateHostsBlock}" on:click={()=>state=stateHostsBlock}>
			Hosts blocks
		</a>
		/
		<a href="#{stateHostsDir}" on:click={()=>state=stateHostsDir}>
			hosts.d
		</a>
		/
		<a href="#{stateMasterDir}" on:click={()=>state=stateMasterDir}>
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
