<script>
	export let min;
	export let max;
	export let val = 0;
	export let unit;

	function onChange() {
		value = +value
		if (isNaN(value)) {
			value = max
		} else if (value < min) {
			value = min
		} else if (value > max) {
			value = max
		}
	}
</script>

<style>
	.input-number input {
		width: 70%;
	}
	.input-number .suffix {
		width: 30%;
	}
</style>

<div class="input-number">
	<input type="number" on:change={onChange} bind:value={val}>
	{#if unit !== ''}
		<span class="suffix">
			{unit}
		</span>
	{/if}
</div>
