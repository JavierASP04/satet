<script>
	let { children } = $props();
</script>

<div class="wrap">
	<table>
		{@render children()}
	</table>
</div>

<style>
	.wrap {
		overflow-x: auto;
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	.wrap :global(th),
	.wrap :global(td) {
		padding: 0.9rem 1rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}

	.wrap :global(th) {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.wrap :global(tr:last-child td) {
		border-bottom: 0;
	}
</style>
