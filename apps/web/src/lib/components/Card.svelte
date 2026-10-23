<script>
	let { kicker = '', title, description = '', children } = $props();
</script>

<article>
	{#if kicker}
		<p class="kicker">{kicker}</p>
	{/if}
	{#if title}
		<h2>{title}</h2>
	{/if}
	{#if description}
		<p class="description">{description}</p>
	{/if}
	{#if children}
		<div class="body">
			{@render children()}
		</div>
	{/if}
</article>

<style>
	article {
		padding: 1.2rem 1.25rem 1.25rem;
		border-radius: 1.4rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	.kicker {
		display: inline-flex;
		margin: 0;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0.7rem 0 0;
		font-size: 1.35rem;
	}

	.description {
		margin: 0.45rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.body {
		margin-top: 0.85rem;
	}

	.body:first-child {
		margin-top: 0;
	}
</style>
