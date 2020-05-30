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

	function showEnvironment() {
		if (state === stateEnvironment) {
			state = '';
		} else {
			state = stateEnvironment;
		}
	}

	function showHostsBlock() {
		state = stateHostsBlock
	}
</script>

<style>
	div.main {
		padding: 1em;
		max-width: 800px;
		margin: 0px auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: normal;
		font-weight: 100;
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
	<a href="#environment" on:click={showEnvironment}>
		Environment
	</a>
	/
	<a href="#hostsblock" on:click={showHostsBlock}>
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
