<script>
	import Alert from '#lib/components/Alert.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { ACTIVITY_LABELS, money, periodLabel, when } from '#lib/mining.js';

	let { data } = $props();

	const total = $derived(
		data.declarations.reduce((sum, row) => sum + Number(row.subtotalVed || 0), 0)
	);

	/** @param {number} value */
	function figure(value) {
		return money(value).replace(/\s*VED$/, '');
	}
</script>

<Screen
	module="02"
	title="Declaraciones extemporáneas"
	description="Presentadas después del día 10, o de un período distinto al mes anterior. La multa de 1.000 EUR no se calcula en esta pantalla."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if data.declarations.length === 0}
			<section class="empty">
				<p class="kicker">Fuera de lapso</p>
				<h2>Sin extemporáneas</h2>
				<p>No hay declaraciones presentadas fuera del lapso.</p>
			</section>
		{:else}
			<section class="board">
				<div class="figure">
					<p class="kicker">Fuera de lapso</p>
					<p class="amount">{data.declarations.length}</p>
					<p class="unit">{data.declarations.length === 1 ? 'declaración' : 'declaraciones'}</p>
				</div>
				<div class="meta">
					<dl>
						<div>
							<dt>Subtotal</dt>
							<dd>{figure(total)} VED</dd>
						</div>
						<div>
							<dt>Multa</dt>
							<dd>Se tramita por expediente</dd>
						</div>
					</dl>
				</div>
			</section>
			<DataTable>
				<thead>
					<tr>
						<th>Contribuyente</th>
						<th>Período</th>
						<th>Actividad</th>
						<th>Material</th>
						<th>Subtotal</th>
						<th>Presentada</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.declarations as declaration (declaration.id)}
						<tr>
							<td>
								<strong>{declaration.companyName}</strong>
								<div class="sub">{declaration.rifNumber}</div>
							</td>
							<td>{periodLabel(declaration.periodYear, declaration.periodMonth)}</td>
							<td>{ACTIVITY_LABELS[declaration.activityType] ?? declaration.activityType}</td>
							<td>{declaration.materialType}</td>
							<td class="num">{money(declaration.subtotalVed)}</td>
							<td>{when(declaration.declarationDate)}</td>
							<td><a href="/mineria/{declaration.id}">Ver</a></td>
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

	.board {
		display: grid;
		grid-template-columns: minmax(12rem, 0.7fr) minmax(16rem, 1fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.figure {
		display: grid;
		align-content: end;
		gap: 0.3rem;
		min-height: 12rem;
		padding: 1.35rem 1.3rem;
		background:
			radial-gradient(320px 140px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
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
		margin: 0.2rem 0 0;
		font-family: var(--display);
		font-size: clamp(2.6rem, 5vw, 3.8rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.unit {
		letter-spacing: 0.04em;
	}

	.meta {
		display: grid;
		align-content: center;
		padding: 1.3rem 1.35rem;
	}

	dl {
		display: grid;
		gap: 0.95rem;
		margin: 0;
	}

	dt {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.15rem 0 0;
		font-size: 1.05rem;
		font-weight: 650;
	}

	.empty {
		display: grid;
		gap: 0.35rem;
		max-width: 34rem;
		padding: 1.4rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.empty .kicker {
		color: var(--muted);
		text-transform: uppercase;
	}

	.empty h2 {
		margin: 0.35rem 0 0.1rem;
		font-size: 1.55rem;
	}

	.empty p {
		margin: 0;
		color: var(--muted);
	}

	.num {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		white-space: nowrap;
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

</style>
