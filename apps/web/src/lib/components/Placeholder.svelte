<script>
	let {
		title = 'Operación pendiente',
		text = 'La consulta y el registro se conectan cuando el módulo correspondiente de la API esté activo.'
	} = $props();
</script>

<section>
	<p class="pill">Próximamente</p>
	<h2>{title}</h2>
	<p class="text">{text}</p>
</section>

<style>
	section {
		max-width: 34rem;
		padding: 1.6rem 1.5rem;
		border-radius: 1.6rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	.pill {
		display: inline-flex;
		margin: 0;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: var(--wine);
		color: #fff;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0.8rem 0 0.4rem;
		font-size: 1.55rem;
	}

	.text {
		margin: 0;
		color: var(--muted);
	}
</style>
