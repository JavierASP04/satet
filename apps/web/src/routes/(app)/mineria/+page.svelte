<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { ACTIVITY_LABELS, STATUS_LABELS, money, periodLabel, volume } from '#lib/mining.js';

	let { data } = $props();

	const total = $derived(
		data.declarations.reduce((sum, row) => sum + Number(row.subtotalVed || 0), 0)
	);
	const lateCount = $derived(data.declarations.filter((row) => row.isExtemporaneous).length);
	const canDeclare = $derived(Boolean(data.taxpayer?.isApproved));

	/** @param {number} value */
	function figure(value) {
		return money(value).replace(/\s*VED$/, '');
	}

	/** @param {string} status */
	function tone(status) {
		if (status === 'VERIFICADO') return 'ok';
		if (status === 'RECHAZADO') return 'bad';
		return 'wait';
	}
</script>

<Screen
	module="02"
	title="Mis declaraciones mineras"
	description="Declaraciones juradas mensuales de extracción, procesamiento y subproductos."
	ready
>
	<div class="stack">
		{#if data.error}
			{#if canDeclare}
				<div class="toolbar">
					<Button href="/mineria/nueva">Nueva declaración</Button>
				</div>
			{/if}
			<Alert>{data.error}</Alert>
		{:else if data.declarations.length === 0}
			<section class="empty">
				<p class="kicker">Declaraciones</p>
				<h2>Sin declaraciones</h2>
				<p>
					{#if canDeclare}
						Todavía no has presentado una declaración minera.
					{:else if data.taxpayer}
						Cuando Recaudación apruebe el expediente podrás declarar el mes anterior, del día 1 al 10.
					{:else}
						Esta cuenta no tiene un expediente de contribuyente.
					{/if}
				</p>
				{#if canDeclare}
					<Button href="/mineria/nueva">Nueva declaración</Button>
				{/if}
			</section>
		{:else}
			<section class="board">
				<div class="figure">
					<p class="kicker">Subtotal declarado</p>
					<p class="amount">{figure(total)}</p>
					<p class="unit">VED · {data.declarations.length === 1 ? '1 declaración' : `${data.declarations.length} declaraciones`}</p>
				</div>
				<div class="meta">
					<dl>
						<div>
							<dt>Declaraciones</dt>
							<dd>{data.declarations.length}</dd>
						</div>
						<div>
							<dt>Extemporáneas</dt>
							<dd>{lateCount}</dd>
						</div>
						<div>
							<dt>Lapso</dt>
							<dd>Día 1 al 10 del mes</dd>
						</div>
					</dl>
					{#if canDeclare}
						<Button href="/mineria/nueva">Nueva declaración</Button>
					{/if}
				</div>
			</section>
			<DataTable>
				<thead>
					<tr>
						<th>Período</th>
						<th>Actividad</th>
						<th>Material</th>
						<th>Volumen</th>
						<th>Subtotal</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.declarations as declaration (declaration.id)}
						<tr>
							<td>
								<strong>{periodLabel(declaration.periodYear, declaration.periodMonth)}</strong>
								{#if declaration.isExtemporaneous}
									<span class="late">Extemporánea</span>
								{/if}
							</td>
							<td>{ACTIVITY_LABELS[declaration.activityType] ?? declaration.activityType}</td>
							<td>{declaration.materialType}</td>
							<td class="num">{volume(declaration.volumeCubicMeters)}</td>
							<td class="num tax">{money(declaration.subtotalVed)}</td>
							<td>
								<span class="pill {tone(declaration.status)}">
									{STATUS_LABELS[declaration.status] ?? declaration.status}
								</span>
							</td>
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
		gap: 0.9rem;
	}

	.toolbar {
		display: flex;
		justify-content: flex-end;
	}

	.board {
		display: grid;
		grid-template-columns: minmax(16rem, 1.15fr) minmax(16rem, 0.9fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.figure {
		display: grid;
		align-content: end;
		gap: 0.35rem;
		min-height: 15rem;
		padding: 1.5rem 1.45rem;
		background:
			radial-gradient(420px 180px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.figure .kicker,
	.unit {
		color: var(--sidebar-muted);
	}

	.amount {
		margin: 0.35rem 0 0;
		font-family: var(--display);
		font-size: clamp(2.4rem, 4.5vw, 3.6rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.unit {
		margin: 0;
	}

	.meta {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 1.4rem 1.35rem;
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
		justify-items: start;
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
	}

	.empty h2 {
		margin: 0.45rem 0 0.15rem;
		font-size: 1.55rem;
	}

	.empty p:last-of-type {
		margin: 0 0 0.85rem;
		color: var(--muted);
	}

	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.tax {
		font-weight: 700;
	}

	.late {
		display: block;
		margin-top: 0.25rem;
		color: var(--warning);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill.wait {
		background: var(--warning-soft);
		color: var(--warning);
	}

	.pill.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	@media (max-width: 800px) {
		.board {
			grid-template-columns: 1fr;
		}

		.figure {
			min-height: 12rem;
		}
	}
</style>
