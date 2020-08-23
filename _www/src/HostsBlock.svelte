<script>
	import { onDestroy } from 'svelte';
	import { WuiPushNotif } from 'wui.svelte';
	import { environment, nanoSeconds, setEnvironment } from './environment.js';

	const apiHostsBlock = "/api/hosts_block"
	let env = {
		NameServers: [],
		HostsBlocks: [],
		HostsFiles: {},
	};

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

		if (res.status >= 400) {
			WuiPushNotif.Error("ERROR: ", res.status, res.statusText)
			return;
		}

		setEnvironment(await res.json());
	}
</script>

<style>
	.block_source {
		width: calc(100% - 2em);
		overflow: auto;
		font-size: 12px;
	}
	.block_source input:disabled {
		color: black;
	}
	.item span {
		display: inline-block;
		margin-right: 1em;
	}
	.item.header {
		font-weight: bold;
		margin-bottom: 1em;
		border-bottom: 1px solid silver;
	}
	.item > span:nth-child(1) {
		width: 4em;
	}
	.item > span:nth-child(2) {
		width: 15em;
	}
	.item > span:nth-child(3) {
		width: 23em;
	}
	.item > span:nth-child(3) input {
		width: 100%;
	}
	.item > span:nth-child(4) {
		width: 16em;
	}
</style>

<div class="hosts-block">
	<p>
	Configure the source of blocked hosts file.
	</p>

	<div class="block_source">
		<div class="item header">
			<span> Enabled </span>
			<span> Name </span>
			<span> URL </span>
			<span> Last updated </span>
		</div>
		{#each env.HostsBlocks as hostsBlock}
		<div class="item">
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
	</div>

	<div>
		<button on:click={updateHostsBlocks}>
			Save
		</button>
	</div>
</div>
