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
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	.wrap :global(th),
	.wrap :global(td) {
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: middle;
	}

	.wrap :global(th) {
		background: #faf6f4;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.wrap :global(th:first-child),
	.wrap :global(td:first-child) {
		padding-left: 1.15rem;
	}

	.wrap :global(tbody tr:last-child td) {
		border-bottom: 0;
	}

	.wrap :global(tbody tr:hover td) {
		background: rgb(243 234 231 / 0.55);
	}

	.wrap :global(a) {
		font-weight: 700;
		color: var(--wine-dark);
		text-decoration: none;
	}

	.wrap :global(a:hover) {
		text-decoration: underline;
	}
</style>
