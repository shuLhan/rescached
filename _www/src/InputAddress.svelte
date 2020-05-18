<script>
	export let value = "";
	let isInvalid = false;
	let error = "";

	function onBlur() {
		const ipport = value.split(":");
		if (ipport.length !== 2) {
			isInvalid = true;
			return;
		}
		const ip = ipport[0];
		if (ip.length > 0) {
			const nums = ip.split(".");
			if (nums.length != 4) {
				isInvalid = true;
				error = "invalid IP address";
				return;
			}
		}
		const port = parseInt(ipport[1]);
		if (isNaN(port) || port <= 0 || port >= 65535) {
			isInvalid = true;
			error = "invalid port number";
			return;
		}
		isInvalid = false;
		value = ip +":"+ port;
	}
</script>

<style>
	.invalid {
		color: red;
	}
</style>

<div class="input-address">
	<input
		type="text"
		bind:value={value}
		on:blur={onBlur}
		class:invalid={isInvalid}
	>
	{#if isInvalid}
	<span class="invalid">{error}</span>
	{/if}
</div>
