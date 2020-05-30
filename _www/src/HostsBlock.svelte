<script>
	import { onDestroy } from 'svelte';

	import { apiEnvironment, environment, nanoSeconds } from './environment.js';

	const apiHostsBlock = "/api/hosts_block"
	let env = {};

	const envUnsubscribe = environment.subscribe(value => {
		env = value;
	});
	onDestroy(envUnsubscribe);

	async function updateHostsBlocks() {
		const res = await fetch(apiHostsBlock, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(env.HostsBlocks),
		});

		const resJSON = await res.json()

		console.log(resJSON);
	}
</script>

<style>
	.block_source.header {
		font-weight: 600;
	}
	.block_source span {
		font-size: 14px;
		display: inline-block;
		margin-right: 10px;
		vertical-align: middle;
	}
	.block_source > span:nth-child(1) {
		width: 60px;
	}
	.block_source > span:nth-child(2) {
		width: 200px;
	}
	.block_source > span:nth-child(3) {
		width: 300px;
	}
	.block_source > span:nth-child(3) input {
		width: 300px;
	}
	.block_source > span:nth-child(4) {
	}
	.block_source input:disabled {
		color: black;
	}
</style>

<div class="hosts-block">
	<h2>
	/ Hosts block
	</h2>

	<p>
	Configure the source of blocked hosts file.
	</p>

	<div class="block_source header">
		<span> Enabled </span>
		<span> Name </span>
		<span> URL </span>
		<span> Last updated </span>
	</div>
	<br/>
	{#each env.HostsBlocks as hostsBlock}
	<div class="block_source">
		<span>
			<input
				type=checkbox
				bind:checked={hostsBlock.IsEnabled}
			>
		</span>
		<span>
			{hostsBlock.Name}
		</span>
		<span>
			<input
				bind:value={hostsBlock.URL}
				disabled
			>
		</span>
		<span>
			{hostsBlock.LastUpdated}
		</span>
	</div>
	{/each}

	<div>
		<button on:click={updateHostsBlocks}>
			Save
		</button>
	</div>
</div>
