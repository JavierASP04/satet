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
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	h2 {
		margin: 0 0 0.9rem;
		color: var(--muted);
		font-family: var(--font);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	dl {
		display: grid;
		gap: 0.7rem;
		margin: 0;
	}

	div {
		display: grid;
		grid-template-columns: 12rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid var(--line);
	}

	div:last-child {
		padding-bottom: 0;
		border-bottom: 0;
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
		overflow-wrap: anywhere;
	}

	@media (max-width: 640px) {
		div {
			grid-template-columns: 1fr;
			gap: 0.15rem;
		}
	}
</style>
