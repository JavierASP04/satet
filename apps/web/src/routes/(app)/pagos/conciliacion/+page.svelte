<script>
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';
	import TextAreaField from '#lib/components/TextAreaField.svelte';

	let rows = $state([
		{
			id: 'pago-01',
			taxpayer: 'Cantera de prueba C.A.',
			rif: 'J-20000012-3',
			tax: 'Minero',
			reference: '0099123401',
			bank: 'Banco del Tesoro',
			amount: '500,00 VED',
			date: '18 oct. 2026',
			status: 'Pendiente',
			reason: '',
			open: false
		},
		{
			id: 'pago-02',
			taxpayer: 'Instituto de Vialidad',
			rif: 'G-20004421-8',
			tax: '1 x 1000',
			reference: '0044882210',
			bank: 'Banco de Venezuela',
			amount: '250,00 VED',
			date: '17 oct. 2026',
			status: 'Pendiente',
			reason: '',
			open: false
		}
	]);

	/** @param {string} id @param {Partial<(typeof rows)[number]>} patch */
	function patch(id, patch) {
		rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
	}
</script>

<Screen
	module="05"
	title="Conciliación de pagos"
	description="Tesorería verifica o rechaza los pagos pendientes."
	ready
>
	<div class="stack">
		<StaticNotice />
		<DataTable>
			<thead>
				<tr>
					<th>Contribuyente</th>
					<th>Tributo</th>
					<th>Referencia</th>
					<th>Monto</th>
					<th>Fecha</th>
					<th>Estado</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr>
						<td>
							<strong>{row.taxpayer}</strong>
							<div class="sub">{row.rif}</div>
						</td>
						<td>{row.tax}</td>
						<td>
							{row.reference}
							<div class="sub">{row.bank}</div>
						</td>
						<td class="num">{row.amount}</td>
						<td>{row.date}</td>
						<td><span class="pill {row.status}">{row.status}</span></td>
						<td>
							{#if row.status === 'Pendiente'}
								<div class="actions">
									<Button type="button" onclick={() => patch(row.id, { status: 'Verificado', open: false })}>
										Verificar
									</Button>
									<button type="button" class="reject" onclick={() => patch(row.id, { open: !row.open })}>
										Rechazar
									</button>
								</div>
							{/if}
						</td>
					</tr>
					{#if row.open && row.status === 'Pendiente'}
						<tr>
							<td colspan="7">
								<form
									class="reason"
									onsubmit={(event) => {
										event.preventDefault();
										if (!row.reason.trim()) return;
										patch(row.id, { status: 'Rechazado', open: false });
									}}
								>
									<TextAreaField
										label="Motivo del rechazo"
										name="reason"
										maxlength="500"
										value={row.reason}
										oninput={(event) => patch(row.id, { reason: event.currentTarget.value })}
									/>
									<Button>Confirmar rechazo</Button>
								</form>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</DataTable>
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

	.num {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill.Pendiente {
		background: var(--warning-soft);
		color: var(--warning);
	}

	.pill.Verificado {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.Rechazado {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		align-items: center;
	}

	.reject {
		border: 0;
		background: transparent;
		color: var(--danger);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.reason {
		display: grid;
		gap: 0.75rem;
		max-width: 36rem;
	}
</style>
