<script>
	import Placeholder from '#lib/components/Placeholder.svelte';

	let { module, title, description = '', ready = false, children } = $props();
</script>

<svelte:head>
	<title>{title} · SATET</title>
</svelte:head>

<header class="head">
	<p class="eyebrow">Módulo {module}</p>
	<h1>{title}</h1>
	{#if description}
		<p>{description}</p>
	{/if}
</header>

{#if children}
	{@render children()}
{:else if !ready}
	<Placeholder />
{/if}

<style>
	.head {
		max-width: 40rem;
		margin-bottom: 1.6rem;
	}

	.eyebrow {
		display: inline-flex;
		margin: 0 0 0.7rem;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 4vw, 2.8rem);
	}

	.head p:last-child {
		margin: 0.75rem 0 0;
		color: var(--muted);
		font-size: 1.02rem;
	}
</style>
