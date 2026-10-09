<script>
	let { title, rows = [] } = $props();
</script>

<section>
	{#if title}
		<h2>{title}</h2>
	{/if}
	<dl>
		{#each rows as [label, value] (label)}
			<div>
				<dt>{label}</dt>
				<dd>{value}</dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	section {
		padding: 1.2rem 1.3rem;
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	h2 {
		margin: 0 0 0.8rem;
		font-size: 1.3rem;
	}

	dl {
		display: grid;
		gap: 0.65rem;
		margin: 0;
	}

	div {
		display: grid;
		grid-template-columns: 12rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
	}

	dt {
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	dd {
		margin: 0;
	}

	@media (max-width: 640px) {
		div {
			grid-template-columns: 1fr;
			gap: 0.15rem;
		}
	}
</style>
