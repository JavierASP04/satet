<script>
	let {
		title = 'Operación pendiente',
		text = 'La consulta y el registro se conectan cuando el módulo correspondiente de la API esté activo.'
	} = $props();
</script>

<section>
	<p class="kicker">Próximamente</p>
	<h2>{title}</h2>
	<p class="text">{text}</p>
</section>

<style>
	section {
		display: grid;
		justify-items: start;
		gap: 0.35rem;
		max-width: 36rem;
		padding: 1.45rem 1.4rem 1.5rem 1.55rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background:
			linear-gradient(var(--wine), var(--wine)) 0 0 / 4px 100% no-repeat,
			var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.kicker {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0.35rem 0 0.1rem;
		font-size: 1.7rem;
	}

	.text {
		margin: 0;
		color: var(--muted);
	}
</style>
