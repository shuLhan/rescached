<script>
	export let target;
	export let title;
	export let info;
	let showInfo = false;
</script>

<style>
	label.label-hint {
		margin-top: 1em;
		max-width: 100%;
	}
	.label-hint-title {
		margin-bottom: 4px;
	}
	.label-hint-toggle {
		border-radius: 50%;
		border: 1px solid grey;
		cursor: pointer;
		display: inline-block;
		font-size: 12px;
		height: 14px;
		line-height: 14px;
		padding: 2px;
		text-align: center;
		width: 14px;
	}
	.label-hint-info {
		background-color: #eee;
		border-radius: 8px;
		margin: 8px 0px;
		padding: 1em;
	}
</style>

<label for={target} class="label-hint"></label>
<div class="label-hint-title">
	{title}:
	<span class="label-hint-toggle" on:click={() => showInfo = !showInfo}>
	?
	</span>
</div>
{#if showInfo}
<div class="label-hint-info">{@html info}</div>
{/if}
