<script>
	import { onMount } from 'svelte';

	import { apiEnvironment, environment, nanoSeconds } from './environment.js';
	import Environment from './Environment.svelte';
	import HostsBlock from './HostsBlock.svelte';
	import HostsDir from './HostsDir.svelte';

	const stateEnvironment = "environment"
	const stateHostsBlock = "hosts_block"
	const stateHostsDir = "hosts_d"

	export let name;
	let state;
	let env = {};

	onMount(async () => {
		const res = await fetch(apiEnvironment);
		let got = await res.json();
		got.PruneDelay = got.PruneDelay / nanoSeconds;
		got.PruneThreshold = got.PruneThreshold / nanoSeconds;
		env = Object.assign(env, got)
        for (let x = 0; x < env.HostsFiles.length; x++) {
            env.HostsFiles[x].hosts = [];
        }
		environment.set(env)
	});
</script>

<style>
	div.main {
		padding: 0px 1em;
		max-width: 800px;
		margin: 0px auto;
	}

	@media (width: 640px) {
		div.main {
			max-width: none;
		}
	}
</style>

<div class="main">
	<h1> {name} </h1>
	<nav class="menu">
	<a href="#home" on:click={()=>state=""}>Home</a>
	/
	<a href="#{stateEnvironment}" on:click={()=>state=stateEnvironment}>
		Environment
	</a>
	/
	<a href="#{stateHostsBlock}" on:click={()=>state=stateHostsBlock}>
		HostsBlock
	</a>
	/
	<a href="#{stateHostsDir}" on:click={()=>state=stateHostsDir}>
		hosts.d
	</a>
	</nav>

	{#if state === stateEnvironment}
		<Environment/>
	{:else if state === stateHostsBlock}
		<HostsBlock/>
	{:else if state === stateHostsDir}
		<HostsDir/>
	{:else}
		<p>
			Welcome to rescached!
		</p>
	{/if}
</div>
