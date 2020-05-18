<script>
	import Environment from './Environment.svelte';

	export let name;
	let state;

	function showEnvironment() {
		if (state === 'environment') {
			state = '';
		} else {
			state = 'environment';
		}
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
	<a href="#" on:click={showEnvironment}>
		Environment
	</a>
	</nav>

	{#if state === 'environment'}
		<Environment/>
	{:else if state === 'hosts'}
	{:else}
		<p>
			Welcome to rescached!
		</p>
	{/if}
</div>
