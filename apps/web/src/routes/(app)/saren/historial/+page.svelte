<script>
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';

	const rows = [
		{
			id: '1',
			when: '20 oct. 2026, 11:40',
			serial: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			office: 'Registro Inmobiliario de Valera',
			result: 'Consumido'
		},
		{
			id: '2',
			when: '19 oct. 2026, 16:05',
			serial: 'a12c90b1-4e21-4c55-9d10-11aa22bb33cc',
			office: 'Notaría Pública de Trujillo',
			result: 'Ya usado'
		},
		{
			id: '3',
			when: '18 oct. 2026, 09:12',
			serial: 'bb001122-3344-4555-8666-778899aabbcc',
			office: 'Registro Mercantil de Valera',
			result: 'Anulado'
		}
	];
</script>

<Screen
	module="06"
	title="Historial de verificaciones"
	description="Verificaciones hechas por la oficina."
	ready
>
	<div class="stack">
		<StaticNotice />
		<DataTable>
			<thead>
				<tr>
					<th>Cuándo</th>
					<th>Serial</th>
					<th>Oficina</th>
					<th>Resultado</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr>
						<td>{row.when}</td>
						<td class="serial">{row.serial}</td>
						<td>{row.office}</td>
						<td><span class="pill {row.result}">{row.result}</span></td>
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

	.serial {
		font-size: 0.82rem;
		overflow-wrap: anywhere;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		background: var(--warning-soft);
		color: var(--warning);
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill.Consumido {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.Anulado {
		background: var(--danger-soft);
		color: var(--danger);
	}
</style>
