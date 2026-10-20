<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { STATUS_LABELS, formatCalendarDate, formatVed } from '#lib/one-per-thousand.js';

	let { data } = $props();

	const totalTax = $derived(
		data.declarations.reduce((sum, row) => sum + Number(row.taxAmountVed || 0), 0)
	);
	const totalExecuted = $derived(
		data.declarations.reduce((sum, row) => sum + Number(row.executedAmountVed || 0), 0)
	);
	const canLoad = $derived(Boolean(data.taxpayer?.isApproved));

	/** @param {number} value */
	function figure(value) {
		return formatVed(value).replace(/\s*VED$/, '');
	}

	/** @param {string} status */
	function tone(status) {
		if (status === 'VERIFICADO') return 'ok';
		if (status === 'RECHAZADO') return 'bad';
		return 'wait';
	}
</script>

<Screen
	module="03"
	title="Retenciones 1 x 1000"
	description="Impuesto sobre el monto ejecutado de cada orden de pago. El cálculo es monto dividido entre 1.000."
	ready
>
	<div class="stack">
		{#if data.error}
			{#if canLoad}
				<div class="toolbar">
					<Button href="/uno-por-mil/cargar">Cargar órdenes</Button>
				</div>
			{/if}
			<Alert>{data.error}</Alert>
		{:else if data.declarations.length === 0}
			<section class="empty">
				<p class="kicker">Impuesto retenido</p>
				<h2>Sin retenciones</h2>
				<p>
					{#if canLoad}
						Todavía no has registrado órdenes de pago.
					{:else if data.taxpayer}
						Cuando Recaudación apruebe el expediente podrás cargar órdenes de pago.
					{:else if data.scope === 'all'}
						No hay retenciones registradas.
					{:else}
						Esta cuenta no tiene un expediente de contribuyente.
					{/if}
				</p>
				{#if canLoad}
					<Button href="/uno-por-mil/cargar">Cargar órdenes</Button>
				{/if}
			</section>
		{:else}
			<section class="board">
				<div class="figure">
					<p class="kicker">Impuesto retenido</p>
					<p class="amount">{figure(totalTax)}</p>
					<p class="unit">VED · {data.scope === 'all' ? 'todas las órdenes' : 'tus órdenes'}</p>
				</div>
				<div class="meta">
					<dl>
						<div>
							<dt>Órdenes</dt>
							<dd>{data.declarations.length}</dd>
						</div>
						<div>
							<dt>Monto ejecutado</dt>
							<dd>{formatVed(totalExecuted)}</dd>
						</div>
						<div>
							<dt>Cálculo</dt>
							<dd>Monto ejecutado / 1.000</dd>
						</div>
					</dl>
					{#if canLoad}
						<Button href="/uno-por-mil/cargar">Cargar órdenes</Button>
					{/if}
				</div>
			</section>
			<DataTable>
				<thead>
					<tr>
						{#if data.scope === 'all'}
							<th>Contribuyente</th>
						{/if}
						<th>Orden</th>
						<th>Ente o banco</th>
						<th>Ejecutado</th>
						<th>Impuesto</th>
						<th>Ejecución</th>
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					{#each data.declarations as row (row.id)}
						<tr>
							{#if data.scope === 'all'}
								<td>
									<strong class="company">{row.companyName}</strong>
									<div class="sub">{row.rifNumber}</div>
								</td>
							{/if}
							<td class="order">{row.paymentOrderNumber}</td>
							<td>{row.entityName}</td>
							<td class="num">{formatVed(row.executedAmountVed)}</td>
							<td class="num tax">{formatVed(row.taxAmountVed)}</td>
							<td class="when">{formatCalendarDate(row.executionDate)}</td>
							<td>
								<span class="pill {tone(row.status)}">{STATUS_LABELS[row.status] ?? row.status}</span>
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
		min-height: 15.5rem;
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
		font-size: clamp(2.6rem, 5vw, 4rem);
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

	.company {
		font-weight: 700;
	}

	.sub {
		color: var(--muted);
		font-size: 0.88rem;
	}

	.order {
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.num,
	.when {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.tax {
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
