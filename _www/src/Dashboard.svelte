<script>
	import {WuiPushNotif} from 'wui.svelte';
	import {getRRTypeName} from './common.js';

	const apiCaches = "/api/caches";

	let query = "";
	let listMsg = [];

	async function handleSearch() {
		const res = await fetch(apiCaches+"?query="+ query)

		if (res.status >= 400) {
			const resbody = await res.json()
			WuiPushNotif.Error("ERROR: "+ resbody.message)
			return;
		}

		listMsg = await res.json()
	}

	async function handleRemoveFromCaches(name) {
		const res = await fetch(apiCaches+"?name="+ name, {
			method: "DELETE",
		})

		if (res.status >= 400) {
			const resbody = await res.json()
			WuiPushNotif.Error("ERROR: "+ resbody.message)
			return;
		}

		for (let x = 0; x < listMsg.length; x++) {
			if (listMsg[x].Question.Name === name) {
				listMsg.splice(x, 1)
				listMsg = listMsg
				break
			}
		}

		const msg = await res.json()

		WuiPushNotif.Info(msg.message)
	}
</script>

<style>
	.message {
		padding: 1em 0px;
		border-bottom: 1px solid silver;
	}
	.rr {
		margin-left: 1em;
		width: 100%;
	}
	.rr.header {
		font-weight: bold;
	}
	.rr span {
		display: inline-block;
	}
	.kind {
		width: 9em;
	}
	.type {
		width: 5em;
	}
	.ttl {
		width: 6em;
	}
</style>

<div class="dashboard">
	<div class="search">
		Caches:
		<input bind:value={query}>
		<button on:click={handleSearch}>
			Search
		</button>
	</div>
	{#each listMsg as msg (msg)}
		<div class="message">
			<div class="qname">
				{msg.Question.Name}

				<button
					class="b-remove"
					on:click={handleRemoveFromCaches(msg.Question.Name)}
				>
					Remove from caches
				</button>
			</div>
			<div class="rr header">
				<span class="kind"> </span>
				<span class="type"> Type </span>
				<span class="ttl"> TTL </span>
				<span class="value"> Value </span>
			</div>

			{#if msg.Answer !== null && msg.Answer.length > 0}
				{#each msg.Answer as rr}
					<div class="rr">
						<span class="kind"> Answer </span>
						<span class="type"> {getRRTypeName(rr.Type)} </span>
						<span class="ttl"> {rr.TTL} </span>
						<span class="value"> {rr.Value} </span>
					</div>
				{/each}
			{/if}
			{#if msg.Authority !== null && msg.Authority.length > 0}
				{#each msg.Authority as rr}
					<div class="rr">
						<span class="kind"> Authority </span>
						<span class="type"> {getRRTypeName(rr.Type)} </span>
						<span class="ttl"> {rr.TTL} </span>
						<span class="value"> {rr.Value} </span>
					</div>
				{/each}
			{/if}
			{#if msg.Additional !== null && msg.Additional.length > 0}
				{#each msg.Additional as rr}
					<div class="rr">
						<span class="kind"> Additional </span>
						<span class="type"> {getRRTypeName(rr.Type)} </span>
						<span class="ttl"> {rr.TTL} </span>
						<span class="value"> {rr.Value} </span>
					</div>
				{/each}
			{/if}
		</div>
	{/each}
</div>
