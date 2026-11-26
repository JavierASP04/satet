<script>
	let { data } = $props();
	const stamp = $derived(data.stamp);
</script>

<svelte:head>
	<title>Timbre {stamp.serial}</title>
</svelte:head>

<main>
	<p>Gobernación del Estado Trujillo · SATET</p>
	<h1>Timbre fiscal</h1>
	<p class="status" data-status={stamp.status}>{stamp.statusLabel}</p>
	<dl>
		<div><dt>Serial</dt><dd>{stamp.serial}</dd></div>
		<div><dt>Contribuyente</dt><dd>{stamp.taxpayer}</dd></div>
		<div><dt>RIF</dt><dd>{stamp.rif}</dd></div>
		<div><dt>Trámite</dt><dd>{stamp.concept ?? '—'}</dd></div>
		<div><dt>Emitido</dt><dd>{stamp.issuedAt}</dd></div>
		<div><dt>Caducidad</dt><dd>{stamp.validityNote}</dd></div>
		<div><dt>Días restantes</dt><dd>{stamp.daysRemaining ?? '—'}</dd></div>
		<div><dt>Monto</dt><dd>{stamp.amountEur} EUR · {stamp.amountVed} VED</dd></div>
		<div><dt>Reutilizable</dt><dd>{stamp.reusable ? 'Sí' : 'No'}</dd></div>
	</dl>
</main>

<style>
	main {
		max-width: 36rem;
		margin: 2rem auto;
		padding: 1.25rem;
		font-family: Georgia, serif;
	}

	.status {
		font-weight: 700;
	}

	dl {
		display: grid;
		gap: 0.75rem;
	}

	dt {
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.15rem 0 0;
	}
</style>
