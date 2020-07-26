<script>
	import { onMount } from 'svelte';

	import { apiEnvironment, environment, nanoSeconds } from './environment.js';
	import Environment from './Environment.svelte';
	import HostsBlock from './HostsBlock.svelte';
	import HostsDir from './HostsDir.svelte';

	const stateHostsBlock = "hosts_block"
	const stateHostsDir = "hosts_d"

	export let name;
	let state;
	let env = {
        NameServers: [],
        HostsBlocks: [],
        HostsFiles: [],
    };

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
        <a href="#" on:click={()=>state=""}>
            {name}
        </a>
        /
        <a href="#{stateHostsBlock}" on:click={()=>state=stateHostsBlock}>
            Hosts blocks
        </a>
        /
        <a href="#{stateHostsDir}" on:click={()=>state=stateHostsDir}>
            hosts.d
        </a>
	</nav>

	{#if state === stateHostsBlock}
		<HostsBlock/>
	{:else if state === stateHostsDir}
		<HostsDir/>
	{:else}
		<Environment/>
	{/if}
</div>
