<script>
	import { enhance } from '$app/forms';
	import { TAX_TYPES } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { confirmSubmit } from '#lib/confirm-decision.js';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextAreaField from '#lib/components/TextAreaField.svelte';
	import { formatCalendarDate } from '#lib/one-per-thousand.js';
	import { SUBJECT_LABELS, TAX_LABELS, formatVedText, paymentStatusLabel, paymentTone } from '#lib/payments.js';

	let { data, form } = $props();

	const taxes = [
		{ value: '', label: 'Todos los tributos' },
		{ value: TAX_TYPES.MINERO, label: 'Impuesto minero' },
		{ value: TAX_TYPES.UN_POR_MIL, label: 'Impuesto 1 x 1000' },
		{ value: TAX_TYPES.TIMBRE_FISCAL, label: 'Timbre fiscal' }
	];

	const orders = [
		{ value: 'payment-desc', label: 'Fecha de pago, más reciente' },
		{ value: 'payment-asc', label: 'Fecha de pago, más antigua' },
		{ value: 'registered-desc', label: 'Registro, más reciente' },
		{ value: 'registered-asc', label: 'Registro, más antiguo' },
		{ value: 'amount-desc', label: 'Monto, mayor primero' },
		{ value: 'amount-asc', label: 'Monto, menor primero' }
	];

	let openId = $state('');
	const payments = $derived(sortPayments(data.payments, data.order));
	const countLabel = $derived(
		payments.length === 1 ? '1 pago pendiente' : `${payments.length} pagos pendientes`
	);

	/**
	 * @param {Record<string, unknown>[]} rows
	 * @param {string | undefined} order
	 */
	function sortPayments(rows, order) {
		const key = order || 'payment-desc';
		const direction = key.endsWith('asc') ? 1 : -1;
		return [...rows].sort((left, right) => compare(left, right, key) * direction);
	}

	/**
	 * @param {Record<string, unknown>} left
	 * @param {Record<string, unknown>} right
	 * @param {string} order
	 */
	function compare(left, right, order) {
		if (order.startsWith('amount')) {
			return Number(left.amountPaidVed) - Number(right.amountPaidVed);
		}
		const field = order.startsWith('registered') ? 'createdAt' : 'paymentDate';
		return time(left[field]) - time(right[field]);
	}

	/** @param {unknown} value */
	function time(value) {
		const parsed = new Date(String(value ?? '')).getTime();
		return Number.isNaN(parsed) ? 0 : parsed;
	}
</script>

<Screen
	module="05"
	title="Conciliación de pagos"
	description="Tesorería verifica o rechaza los pagos pendientes. Verificar aprueba la planilla si seguía pendiente."
	ready
>
	<div class="stack">
		<header class="print-band">
			<img src="/satet-sidebar.png" alt="SATET" />
			<img src="/gobernacion-blanco.png" alt="Gobernación del Estado Trujillo" />
		</header>
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : form.tone === 'warn' ? 'warn' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if form?.notice}
			<section class="notice">
				<p class="kicker">Aviso al contribuyente</p>
				<h2>{form.notice.subject}</h2>
				<p>{form.notice.body}</p>
			</section>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}

		<section class="bar">
			<form class="filter" method="GET">
				<SelectField label="Tributo" name="taxType" options={taxes} value={data.taxType} />
				<SelectField label="Orden" name="order" options={orders} value={data.order} />
				<Button>Filtrar</Button>
			</form>
			<p class="count">{countLabel}</p>
		</section>

		{#if payments.length === 0}
			<section class="empty">
				<p class="kicker">Pendientes</p>
				<h2>Sin pagos por conciliar</h2>
				<p>Cuando un contribuyente registre una transferencia, aparecerá aquí para verificarla o rechazarla.</p>
			</section>
		{:else}
			<ul class="cards">
				{#each payments as row (row.id)}
					<li class="card">
						<div class="top">
							<div>
								<p class="company">{row.companyName}</p>
								<p class="rif">{row.rifNumber}</p>
							</div>
							<div class="money">
								<p class="amount">{formatVedText(row.amountPaidVed)}</p>
								<span class="pill {paymentTone(row.status)}">{paymentStatusLabel(row.status)}</span>
							</div>
						</div>
						<dl>
							<div>
								<dt>Tributo</dt>
								<dd>
									{TAX_LABELS[row.taxType] ?? row.taxType}
									{#if row.relatedKind}
										<span>{SUBJECT_LABELS[row.relatedKind] ?? row.relatedKind}</span>
									{/if}
								</dd>
							</div>
							<div>
								<dt>Referencia</dt>
								<dd>{row.bankReferenceNumber}</dd>
							</div>
							<div>
								<dt>Origen</dt>
								<dd>{row.originBank}</dd>
							</div>
							<div>
								<dt>Destino</dt>
								<dd>{row.bankName}<span>{row.accountNumber}</span></dd>
							</div>
							<div>
								<dt>Fecha</dt>
								<dd>{formatCalendarDate(row.paymentDate)}</dd>
							</div>
						</dl>
						<div class="actions">
							<a class="tool" href="/pagos/{row.id}/comprobante">Comprobante</a>
							<form method="POST" action="?/verify" use:enhance use:confirmSubmit>
								<input type="hidden" name="id" value={row.id} />
								<Button>Verificar</Button>
							</form>
							<button
								type="button"
								class="tool danger"
								aria-expanded={openId === row.id}
								onclick={() => (openId = openId === row.id ? '' : row.id)}
							>
								{openId === row.id ? 'Cerrar rechazo' : 'Rechazar'}
							</button>
						</div>
						{#if openId === row.id}
							<form class="reason" method="POST" action="?/reject" use:enhance use:confirmSubmit>
								<input type="hidden" name="id" value={row.id} />
								<TextAreaField
									label="Motivo del rechazo"
									name="rejectionReason"
									required
									maxlength="500"
								/>
								<div>
									<Button>Confirmar rechazo</Button>
								</div>
							</form>
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

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.filter {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
		flex: 1 1 22rem;
	}

	.filter :global(.field) {
		flex: 1 1 16rem;
	}

	.count {
		margin: 0;
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		background: var(--warning-soft);
		color: var(--warning);
		font-size: 0.82rem;
		font-weight: 700;
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
		gap: 0.95rem;
		padding: 1.15rem 1.2rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.company,
	.rif,
	.amount {
		margin: 0;
	}

	.company {
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.rif {
		margin-top: 0.2rem;
		color: var(--muted);
	}

	.money {
		display: grid;
		justify-items: end;
		gap: 0.4rem;
	}

	.amount {
		font-family: var(--display);
		font-size: clamp(1.5rem, 2.4vw, 2rem);
		font-weight: 650;
		letter-spacing: -0.04em;
		line-height: 1;
		white-space: nowrap;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.75rem 1rem;
		margin: 0;
		padding-top: 0.15rem;
	}

	dt {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	dd {
		margin: 0.15rem 0 0;
		font-weight: 650;
		overflow-wrap: anywhere;
	}

	dd span {
		display: block;
		margin-top: 0.1rem;
		color: var(--muted);
		font-weight: 500;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		align-items: center;
		padding-top: 0.15rem;
	}

	.tool {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.8rem;
		padding: 0.55rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}

	.tool:hover {
		background: var(--wine-soft);
	}

	.tool.danger {
		border-color: rgb(180 35 24 / 0.22);
		background: var(--danger-soft);
		color: var(--danger);
	}

	.tool.danger:hover {
		background: #fdeceb;
	}

	.reason {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 1rem;
		background: #f4faf6;
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

	.empty,
	.notice {
		padding: 1.35rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
	}

	.empty {
		background:
			radial-gradient(420px 160px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.empty .kicker {
		color: var(--sidebar-muted);
	}

	.empty h2,
	.notice h2 {
		margin: 0.4rem 0 0.4rem;
		font-size: 1.55rem;
	}

	.empty p,
	.notice p {
		margin: 0;
		max-width: 40rem;
		color: var(--muted);
		white-space: pre-wrap;
	}

	.empty p {
		color: var(--sidebar-muted);
	}

	.notice {
		border-color: rgb(180 35 24 / 0.18);
		background: var(--danger-soft);
	}

	.notice .kicker,
	.notice h2 {
		color: var(--danger);
	}

	.notice p {
		color: var(--ink);
	}

	.print-band {
		display: none;
	}

	@media print {
		:global(html),
		:global(body),
		.print-band,
		.print-band img {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		:global(aside),
		:global(.topbar),
		:global(.head),
		.bar,
		.actions,
		.reason,
		.notice {
			display: none !important;
		}

		.print-band {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 1rem;
			padding: 0.8rem 1rem;
			background: #0f2e22 !important;
		}

		.print-band img {
			width: auto;
			background: transparent;
		}

		.print-band img:first-child {
			height: 3.2rem;
		}

		.print-band img:last-child {
			height: 1.7rem;
		}
	}

	@media (max-width: 980px) {
		dl {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.top,
		.money {
			display: grid;
			justify-items: start;
		}

		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
