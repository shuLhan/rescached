<script>
	import { onMount } from 'svelte';

	import { apiEnvironment, environment, nanoSeconds } from './environment.js';
	import Environment from './Environment.svelte';
	import HostsBlock from './HostsBlock.svelte';

	const stateEnvironment = "environment"
	const stateHostsBlock = "hosts_block"

	export let name;
	let state;
	let env = {};

	onMount(async () => {
		const res = await fetch(apiEnvironment);
		let got = await res.json();
		got.PruneDelay = got.PruneDelay / nanoSeconds;
		got.PruneThreshold = got.PruneThreshold / nanoSeconds;
		env = Object.assign(env, got)
		environment.set(env)
		console.log("Environment:", environment)
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
	</nav>

	{#if state === stateEnvironment}
		<Environment/>
	{:else if state === stateHostsBlock}
		<HostsBlock/>
	{:else}
		<p>
			Welcome to rescached!
		</p>
	{/if}
</div>
