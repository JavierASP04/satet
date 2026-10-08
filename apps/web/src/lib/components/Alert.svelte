<script>
	let { tone = 'danger', children } = $props();
</script>

<p class="alert {tone}">
	{@render children()}
</p>

<style>
	.alert {
		margin: 0;
		padding: 0.85rem 1rem;
		border-radius: 1rem;
	}

	.danger {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.warn {
		background: var(--warning-soft);
		color: var(--warning);
	}
</style>
