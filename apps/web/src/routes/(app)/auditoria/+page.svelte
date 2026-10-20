<script>
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';

	const logs = [
		{
			id: '1',
			when: '20 oct. 2026, 12:02',
			action: 'CREATE',
			table: 'mining_declarations',
			who: 'perfil.dev@satet.local',
			ip: '127.0.0.1'
		},
		{
			id: '2',
			when: '20 oct. 2026, 11:10',
			action: 'APPROVE',
			table: 'taxpayers',
			who: 'admin@satet.local',
			ip: '10.0.0.8'
		},
		{
			id: '3',
			when: '19 oct. 2026, 18:00',
			action: 'CREATE',
			table: 'bcv_rates',
			who: 'sistema',
			ip: '127.0.0.1'
		},
		{
			id: '4',
			when: '18 oct. 2026, 09:40',
			action: 'CREATE',
			table: 'one_per_thousand_declarations',
			who: 'perfil.dev@satet.local',
			ip: '127.0.0.1'
		}
	];

	const actions = [
		{ value: '', label: 'Todas' },
		{ value: 'CREATE', label: 'CREATE' },
		{ value: 'APPROVE', label: 'APPROVE' }
	];

	const tables = [
		{ value: '', label: 'Todas' },
		{ value: 'mining_declarations', label: 'mining_declarations' },
		{ value: 'taxpayers', label: 'taxpayers' },
		{ value: 'bcv_rates', label: 'bcv_rates' },
		{ value: 'one_per_thousand_declarations', label: 'one_per_thousand_declarations' }
	];

	let action = $state('');
	let table = $state('');
	let applied = $state({ action: '', table: '' });

	const visible = $derived(
		logs.filter(
			(row) =>
				(!applied.action || row.action === applied.action) &&
				(!applied.table || row.table === applied.table)
		)
	);
</script>

<Screen
	module="07"
	title="Auditoría"
	description="Bitácora de las acciones registradas en el sistema."
	ready
>
	<div class="stack">
		<StaticNotice />
		<form
			class="filters"
			onsubmit={(event) => {
				event.preventDefault();
				applied = { action, table };
			}}
		>
			<SelectField
				label="Acción"
				name="action"
				options={actions}
				value={action}
				onchange={(event) => (action = event.currentTarget.value)}
			/>
			<SelectField
				label="Tabla"
				name="table"
				options={tables}
				value={table}
				onchange={(event) => (table = event.currentTarget.value)}
			/>
			<Button>Filtrar muestra</Button>
		</form>
		<DataTable>
			<thead>
				<tr>
					<th>Cuándo</th>
					<th>Acción</th>
					<th>Tabla</th>
					<th>Quién</th>
					<th>IP</th>
				</tr>
			</thead>
			<tbody>
				{#each visible as row (row.id)}
					<tr>
						<td>{row.when}</td>
						<td><span class="pill">{row.action}</span></td>
						<td>{row.table}</td>
						<td>{row.who}</td>
						<td>{row.ip}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5">Ningún ejemplo coincide con el filtro.</td>
					</tr>
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

	.filters {
		display: grid;
		grid-template-columns: minmax(0, 14rem) minmax(0, 18rem) auto;
		gap: 0.75rem;
		align-items: end;
		padding: 1rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: 1.25rem;
		background: var(--surface);
	}

	.pill {
		display: inline-flex;
		padding: 0.22rem 0.55rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.75rem;
		font-weight: 700;
	}

	@media (max-width: 800px) {
		.filters {
			grid-template-columns: 1fr;
		}
	}
</style>
