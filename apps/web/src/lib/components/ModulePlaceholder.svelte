<script lang="ts">
	interface Props {
		title: string;
		/** Número de módulo según la especificación técnica. */
		module: string;
		description?: string;
		/** Endpoints de la API que consumirá esta pantalla. */
		endpoints?: string[];
	}

	let { title, module, description, endpoints = [] }: Props = $props();
</script>

<svelte:head>
	<title>{title} · SATET</title>
</svelte:head>

<section class="placeholder">
	<p class="badge">Módulo {module} · En construcción</p>
	<h1>{title}</h1>
	{#if description}
		<p class="description">{description}</p>
	{/if}

	{#if endpoints.length > 0}
		<h2>Endpoints previstos</h2>
		<ul>
			{#each endpoints as endpoint (endpoint)}
				<li><code>{endpoint}</code></li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.placeholder {
		max-width: 48rem;
		padding: 2rem;
		border: 1px dashed var(--color-border);
		border-radius: 0.75rem;
		background: var(--color-surface);
	}

	.badge {
		display: inline-block;
		margin: 0 0 0.75rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.8rem;
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	h1 {
		margin: 0 0 0.5rem;
	}

	h2 {
		margin-top: 1.5rem;
		font-size: 1rem;
	}

	.description {
		color: var(--color-muted);
	}

	ul {
		padding-left: 1.25rem;
	}
</style>
