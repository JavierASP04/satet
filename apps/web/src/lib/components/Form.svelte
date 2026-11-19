<script>
	import { enhance } from '$app/forms';

	let { columns = 1, submit, children, ...rest } = $props();
</script>

{#if submit}
	<form class="grid" class:two={columns === 2} use:enhance={submit} {...rest}>
		{@render children()}
	</form>
{:else}
	<form class="grid" class:two={columns === 2} {...rest}>
		{@render children()}
	</form>
{/if}

<style>
	.grid {
		display: grid;
		gap: 0.95rem;
	}

	.two {
		grid-template-columns: 1fr 1fr;
	}

	@media (max-width: 720px) {
		.two {
			grid-template-columns: 1fr;
		}
	}
</style>
