<script>
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';

	const title = $derived.by(() => {
		if (page.status === 409) return 'No se puede continuar';
		if (page.status === 403) return 'Sin permiso';
		if (page.status === 404) return 'No se encontró';
		return 'No se pudo completar';
	});

	const message = $derived(
		page.error?.message || 'Vuelve a intentarlo desde el módulo correspondiente.'
	);
</script>

<Screen module="07" {title} description="Esta operación no cambió ningún dato." ready>
	<section class="panel">
		<p class="kicker">{page.status}</p>
		<h2>{title}</h2>
		<p>{message}</p>
		<Button href="/panel" variant="light">Ir al panel</Button>
	</section>
</Screen>

<style>
	.panel {
		display: grid;
		justify-items: start;
		gap: 0.45rem;
		max-width: 40rem;
		padding: 1.4rem 1.35rem;
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	h2,
	p {
		margin: 0;
	}

	.kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--sidebar-muted);
	}

	h2 {
		font-family: var(--display);
		font-size: 1.7rem;
		letter-spacing: -0.03em;
	}

	p {
		max-width: 36rem;
		color: var(--sidebar-muted);
	}

	.panel :global(a) {
		margin-top: 0.6rem;
	}
</style>
