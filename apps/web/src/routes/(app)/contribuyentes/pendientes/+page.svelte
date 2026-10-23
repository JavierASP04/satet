<script>
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Placeholder from '#lib/components/Placeholder.svelte';
	import Screen from '#lib/components/Screen.svelte';

	let { data, form } = $props();

	/** @param {string | null | undefined} value */
	function when(value) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(value));
	}
</script>

<Screen
	module="01"
	title="Solicitudes pendientes"
	description="Expedientes que Recaudación todavía no aprueba."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if data.taxpayers.length === 0}
			<Placeholder title="Bandeja vacía" text="No hay solicitudes pendientes." />
		{:else}
			<section class="board">
				<div class="figure">
					<p class="kicker">Por aprobar</p>
					<p class="amount">{data.taxpayers.length}</p>
					<p class="unit">{data.taxpayers.length === 1 ? 'expediente' : 'expedientes'}</p>
				</div>
				<div class="meta">
					<p>Cada aprobación habilita declaraciones, retenciones y timbres para esa cuenta.</p>
				</div>
			</section>
			<DataTable>
				<thead>
					<tr>
						<th>Contribuyente</th>
						<th>RIF</th>
						<th>Correo</th>
						<th>Registro</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.taxpayers as taxpayer (taxpayer.id)}
						<tr>
							<td>
								<strong>{taxpayer.companyName}</strong>
								<div class="sub">{taxpayer.legalRepresentativeName}</div>
							</td>
							<td>{taxpayer.rifNumber}</td>
							<td>{taxpayer.email}</td>
							<td>{when(taxpayer.createdAt)}</td>
							<td>
								<form method="POST" action="?/approve" use:enhance>
									<input type="hidden" name="id" value={taxpayer.id} />
									<Button>Aprobar</Button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.board {
		display: grid;
		grid-template-columns: minmax(12rem, 0.55fr) minmax(16rem, 1fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.figure {
		display: grid;
		align-content: end;
		gap: 0.25rem;
		min-height: 11rem;
		padding: 1.3rem 1.25rem;
		background:
			radial-gradient(280px 120px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	.unit {
		margin: 0;
		color: var(--sidebar-muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.amount {
		margin: 0.15rem 0 0;
		font-family: var(--display);
		font-size: 3.2rem;
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.meta {
		display: grid;
		align-content: center;
		padding: 1.3rem 1.35rem;
	}

	.meta p {
		max-width: 28rem;
		margin: 0;
		color: var(--muted);
		font-size: 1.02rem;
	}

	@media (max-width: 800px) {
		.board {
			grid-template-columns: 1fr;
		}
	}

	.sub {
		color: var(--muted);
		font-size: 0.88rem;
	}

	form {
		margin: 0;
	}
</style>
