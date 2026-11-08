<script>
	import { enhance } from '$app/forms';
	import { hasPermission, PERMISSIONS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { STATUS_LABELS, formatCalendarDate, formatVed } from '#lib/one-per-thousand.js';

	let { data, form } = $props();

	const canResolve = $derived(hasPermission(data.user?.role, PERMISSIONS.DECLARACIONES_RESOLVER));
	const canLoad = $derived(Boolean(data.taxpayer?.isApproved));

	const filings = $derived.by(() => {
		/** @type {Map<string, { id: string, filingId: string | null, status: string, companyName?: string, rifNumber?: string, orders: any[] }>} */
		const groups = new Map();
		for (const row of data.declarations) {
			const key = row.filingId || row.id;
			let group = groups.get(key);
			if (!group) {
				group = {
					id: key,
					filingId: row.filingId ?? null,
					status: row.status,
					companyName: row.companyName,
					rifNumber: row.rifNumber,
					orders: []
				};
				groups.set(key, group);
			}
			group.orders.push(row);
		}
		return [...groups.values()];
	});

	const summary = $derived.by(() => {
		let pending = 0;
		let verified = 0;
		let rejected = 0;
		let executed = 0;
		let tax = 0;
		for (const row of data.declarations) {
			executed += Number(row.executedAmountVed) || 0;
			tax += Number(row.taxAmountVed) || 0;
			if (row.status === 'VERIFICADO') verified += 1;
			else if (row.status === 'RECHAZADO') rejected += 1;
			else pending += 1;
		}
		return { pending, verified, rejected, executed, tax, total: data.declarations.length };
	});

	/** @param {number} value */
	function figure(value) {
		return formatVed(value).replace(/\s*VED$/, '');
	}

	/**
	 * @param {{ orders: { totalTaxVed?: string | number | null, taxAmountVed?: string | number | null }[] }} group
	 */
	function filingTax(group) {
		const stated = Number(group.orders[0]?.totalTaxVed);
		if (Number.isFinite(stated) && group.orders[0]?.totalTaxVed != null) return stated;
		return group.orders.reduce((sum, row) => sum + (Number(row.taxAmountVed) || 0), 0);
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
		{#if data.aviso}
			<Alert tone={data.avisoTone === 'warn' ? 'warn' : 'danger'}>{data.aviso}</Alert>
		{/if}
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : form.tone === 'warn' ? 'warn' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
			{#if canLoad}
				<div class="toolbar">
					<Button href="/uno-por-mil/cargar">Cargar órdenes</Button>
				</div>
			{/if}
		{:else if data.declarations.length === 0}
			<section class="empty">
				<div>
					<p class="kicker">Impuesto retenido</p>
					<h2>Sin retenciones</h2>
					<p>
						{#if canLoad}
							Todavía no has registrado órdenes de pago.
						{:else if data.taxpayer}
							Cuando el administrador apruebe el expediente podrás cargar órdenes de pago.
						{:else if data.scope === 'all'}
							No hay retenciones registradas.
						{:else}
							Esta cuenta no tiene un expediente de contribuyente.
						{/if}
					</p>
				</div>
				{#if canLoad}
					<Button href="/uno-por-mil/cargar" variant="light">Cargar órdenes</Button>
				{/if}
			</section>
		{:else}
			<section class="summary" aria-label="Resumen de retenciones">
				<article>
					<p class="kicker">Impuesto retenido</p>
					<p class="figure">{figure(summary.tax)}</p>
					<p class="caption">VED · monto ejecutado / 1.000</p>
				</article>
				<article>
					<p class="kicker">Órdenes</p>
					<p class="figure">{summary.total}</p>
					<p class="caption">{formatVed(summary.executed)} ejecutado</p>
				</article>
				<article>
					<p class="kicker">Pendientes</p>
					<p class="figure wait">{summary.pending}</p>
					<p class="caption">esperan decisión</p>
				</article>
				<article>
					<p class="kicker">Verificadas</p>
					<p class="figure ok">{summary.verified}</p>
					<p class="caption">con planilla</p>
				</article>
				<article>
					<p class="kicker">Rechazadas</p>
					<p class="figure bad">{summary.rejected}</p>
					<p class="caption">sin planilla</p>
				</article>
			</section>

			{#if canLoad}
				<div class="toolbar">
					<Button href="/uno-por-mil/cargar">Cargar órdenes</Button>
				</div>
			{/if}

			<ul class="cards">
				{#each filings as group (group.id)}
					<li class="card {tone(group.status)}">
						<div class="top">
							<div>
								<p class="kicker">
									{#if data.scope === 'all' && group.companyName}
										{group.companyName}
									{:else}
										Carga
									{/if}
								</p>
								<p class="subject">
									{group.orders.length === 1
										? `Orden ${group.orders[0].paymentOrderNumber}`
										: `${group.orders.length} órdenes`}
								</p>
								{#if data.scope === 'all' && group.rifNumber}
									<p class="rif">{group.rifNumber}</p>
								{/if}
							</div>
							<span class="pill {tone(group.status)}"
								>{STATUS_LABELS[group.status] ?? group.status}</span
							>
						</div>
						<p class="amount">{formatVed(filingTax(group))}</p>
						<ul class="orders">
							{#each group.orders as order (order.id)}
								<li>
									<div>
										<p class="order">{order.paymentOrderNumber}</p>
										<p class="entity">{order.entityName}</p>
									</div>
									<div class="facts">
										<p>{formatVed(order.executedAmountVed)}</p>
										<p>Impuesto {formatVed(order.taxAmountVed)}</p>
										<p>{formatCalendarDate(order.executionDate)}</p>
									</div>
								</li>
							{/each}
						</ul>
						{#if group.filingId && group.status === 'VERIFICADO'}
							<a class="planilla" href="/uno-por-mil/cargas/{group.filingId}/planilla">Planilla</a>
						{:else if canResolve && group.filingId && group.status === 'PENDIENTE'}
							<div class="actions">
								<form method="POST" action="?/resolve" use:enhance>
									<input type="hidden" name="filingId" value={group.filingId} />
									<input type="hidden" name="decision" value="APROBAR" />
									<Button>Aprobar</Button>
								</form>
								<form class="reject" method="POST" action="?/resolve" use:enhance>
									<input type="hidden" name="filingId" value={group.filingId} />
									<input type="hidden" name="decision" value="RECHAZAR" />
									<TextField
										label="Motivo del rechazo"
										name="rejectionReason"
										required
										maxlength="500"
									/>
									<Button variant="ghost">Rechazar</Button>
								</form>
							</div>
							{#if group.orders.length > 1}
								<p class="hint">Aprobar o rechazar cambia todas las órdenes de esta carga.</p>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 1rem;
	}

	.summary {
		display: grid;
		grid-template-columns: 1.35fr repeat(4, 1fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.summary article {
		display: grid;
		align-content: end;
		gap: 0.2rem;
		min-height: 8.2rem;
		padding: 1.15rem 1.2rem;
		border-left: 1px solid var(--line);
	}

	.summary article:first-child {
		border-left: 0;
		background:
			radial-gradient(280px 120px at 0% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	.caption,
	.rif,
	.entity,
	.hint,
	.facts p {
		margin: 0;
	}

	.kicker,
	.caption {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.kicker {
		color: var(--wine-dark);
	}

	.summary article:first-child .kicker,
	.summary article:first-child .caption,
	.empty .kicker {
		color: var(--sidebar-muted);
	}

	.caption {
		color: var(--muted);
		letter-spacing: 0;
		text-transform: none;
		font-size: 0.88rem;
		font-weight: 500;
	}

	.figure,
	.amount,
	.subject,
	.order {
		margin: 0;
		font-family: var(--display);
		font-weight: 650;
		letter-spacing: -0.04em;
	}

	.figure {
		font-size: clamp(1.8rem, 2.6vw, 2.5rem);
		line-height: 0.95;
	}

	.figure.wait {
		color: var(--warning);
	}

	.figure.ok {
		color: var(--ok);
	}

	.figure.bad {
		color: var(--danger);
	}

	.toolbar {
		display: flex;
	}

	.cards {
		display: grid;
		gap: 0.85rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: grid;
		gap: 0.85rem;
		padding: 1.15rem 1.2rem 1.15rem 1.35rem;
		border: 1px solid var(--line);
		border-left: 4px solid var(--warning);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.card.ok {
		border-left-color: var(--ok);
	}

	.card.bad {
		border-left-color: var(--danger);
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.subject {
		margin-top: 0.15rem;
		font-size: 1.35rem;
		letter-spacing: -0.03em;
	}

	.rif,
	.entity,
	.hint,
	.facts p {
		color: var(--muted);
	}

	.amount {
		font-size: clamp(1.6rem, 2.4vw, 2.1rem);
		line-height: 1;
	}

	.orders {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.orders li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.9rem;
		border-radius: 1rem;
		background: var(--canvas);
	}

	.order {
		font-size: 1.05rem;
		letter-spacing: -0.02em;
	}

	.facts {
		text-align: right;
	}

	.facts p:first-child {
		color: var(--ink);
		font-weight: 650;
	}

	.pill {
		display: inline-flex;
		padding: 0.32rem 0.75rem;
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

	.actions {
		display: grid;
		grid-template-columns: max-content minmax(16rem, 24rem);
		justify-content: start;
		gap: 0.75rem;
		align-items: end;
	}

	.actions > form:first-child {
		justify-self: start;
	}

	.actions form,
	.reject {
		display: grid;
		gap: 0.55rem;
		margin: 0;
	}

	.reject {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
	}

	.planilla {
		justify-self: start;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		font-weight: 700;
		text-decoration: none;
	}

	.planilla:hover {
		background: var(--wine-soft);
	}

	.empty {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.4rem 1.35rem;
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.empty h2 {
		margin: 0.35rem 0 0.4rem;
		font-size: 1.7rem;
	}

	.empty p {
		margin: 0;
		max-width: 36rem;
		color: var(--sidebar-muted);
	}

	@media (max-width: 1100px) {
		.summary {
			grid-template-columns: 1fr 1fr;
		}

		.summary article:nth-child(odd) {
			border-left: 0;
		}

		.summary article:nth-child(n + 3) {
			border-top: 1px solid var(--line);
		}

		.summary article:first-child {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 720px) {
		.actions,
		.reject,
		.orders li {
			grid-template-columns: 1fr;
			display: grid;
		}

		.facts {
			text-align: left;
		}
	}
</style>
