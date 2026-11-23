<script>
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';

	let { data, form } = $props();
</script>

<Screen
	module="04"
	title="Solicitudes de timbre"
	description="El timbre se aprueba cuando el pago ya fue registrado y conciliado. Rechazar pide un motivo."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}
		{#if data.stamps.length === 0}
			<p>No hay solicitudes pendientes.</p>
		{:else}
			<DataTable>
				<thead>
					<tr>
						<th>Contribuyente</th>
						<th>Concepto</th>
						<th>Monto</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.stamps as stamp (stamp.uuid)}
						<tr>
							<td>{stamp.taxpayer}</td>
							<td>{stamp.concept ?? '—'}</td>
							<td>{stamp.amountVed} VED</td>
							<td>
								<form method="POST" use:enhance>
									<input type="hidden" name="uuid" value={stamp.uuid} />
									<input type="hidden" name="decision" value="APROBAR" />
									<Button>Aprobar</Button>
								</form>
								<form method="POST" use:enhance>
									<input type="hidden" name="uuid" value={stamp.uuid} />
									<input type="hidden" name="decision" value="RECHAZAR" />
									<input name="rejectionReason" required placeholder="Motivo del rechazo" />
									<Button variant="ghost">Rechazar</Button>
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
		gap: 1rem;
	}

	td form {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		margin-bottom: 0.35rem;
	}

	input[name='rejectionReason'] {
		min-width: 12rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 0.6rem;
	}
</style>
