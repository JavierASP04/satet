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
		gap: 0.85rem;
	}

	.sub {
		color: var(--muted);
		font-size: 0.88rem;
	}

	form {
		margin: 0;
	}
</style>
