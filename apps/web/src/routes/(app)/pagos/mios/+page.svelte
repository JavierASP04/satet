<script>
	import { PAYMENT_STATUS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { formatCalendarDate } from '#lib/one-per-thousand.js';
	import {
		SUBJECT_LABELS,
		TAX_LABELS,
		formatVedText,
		paymentStatusLabel,
		paymentTone
	} from '#lib/payments.js';

	let { data } = $props();

	const summary = $derived.by(() => {
		const payments = data.payments ?? [];
		let pending = 0;
		let verified = 0;
		let rejected = 0;
		let verifiedVed = 0;
		for (const row of payments) {
			if (row.status === PAYMENT_STATUS.VERIFICADO) {
				verified += 1;
				verifiedVed += Number(row.amountPaidVed) || 0;
			} else if (row.status === PAYMENT_STATUS.RECHAZADO) {
				rejected += 1;
			} else {
				pending += 1;
			}
		}
		return { pending, verified, rejected, verifiedVed, total: payments.length };
	});
</script>

<Screen
	module="05"
	title="Mis pagos"
	description="Transferencias de esta cuenta. Si tesorería rechaza una, el aviso queda aquí."
	ready
>
	<div class="stack">
		{#if data.registered}
			<Alert tone="ok">Pago registrado. Queda pendiente de conciliación.</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if data.payments.length === 0}
			<section class="empty">
				<div>
					<p class="kicker">Pagos</p>
					<h2>Sin pagos registrados</h2>
					<p>Cuando registres una transferencia, aparecerá aquí con su estado y su comprobante.</p>
				</div>
				<Button href="/pagos/registrar" variant="light">Registrar pago</Button>
			</section>
		{:else}
			<section class="summary" aria-label="Resumen de pagos">
				<article>
					<p class="kicker">En esta cuenta</p>
					<p class="figure">{summary.total}</p>
					<p class="caption">
						{summary.total === 1 ? 'transferencia registrada' : 'transferencias registradas'}
					</p>
				</article>
				<article>
					<p class="kicker">Pendientes</p>
					<p class="figure wait">{summary.pending}</p>
					<p class="caption">esperan conciliación</p>
				</article>
				<article>
					<p class="kicker">Verificados</p>
					<p class="figure ok">{summary.verified}</p>
					<p class="caption">{formatVedText(summary.verifiedVed)}</p>
				</article>
				<article>
					<p class="kicker">Rechazados</p>
					<p class="figure bad">{summary.rejected}</p>
					<p class="caption">con aviso en la ficha</p>
				</article>
			</section>

			<div class="toolbar">
				<Button href="/pagos/registrar">Registrar pago</Button>
			</div>

			<ul class="cards">
				{#each data.payments as row (row.id)}
					<li class="card {paymentTone(row.status)}">
						<div class="top">
							<div>
								<p class="tax">{TAX_LABELS[row.taxType] ?? row.taxType}</p>
								<p class="subject">
									{row.relatedKind ? (SUBJECT_LABELS[row.relatedKind] ?? row.relatedKind) : 'Sin obligación asociada'}
								</p>
							</div>
							<span class="pill {paymentTone(row.status)}">{paymentStatusLabel(row.status)}</span>
						</div>
						<p class="amount">{formatVedText(row.amountPaidVed)}</p>
						<dl>
							<div>
								<dt>Fecha</dt>
								<dd>{formatCalendarDate(row.paymentDate)}</dd>
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
								<dd>{row.bankName} · {row.accountNumber}</dd>
							</div>
						</dl>
						{#if row.notice}
							<div class="notice">
								<p class="notice-kicker">Aviso de tesorería</p>
								<p class="notice-title">{row.notice.subject}</p>
								<p class="notice-body">{row.notice.body}</p>
							</div>
						{/if}
						<a class="voucher" href="/pagos/{row.id}/comprobante">Ver comprobante</a>
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
		grid-template-columns: 1.3fr repeat(3, 1fr);
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
		min-height: 8.5rem;
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
	.caption {
		margin: 0;
	}

	.kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.summary article:first-child .kicker,
	.summary article:first-child .caption {
		color: var(--sidebar-muted);
	}

	.figure {
		margin: 0.15rem 0 0;
		font-family: var(--display);
		font-size: clamp(2rem, 3vw, 2.7rem);
		font-weight: 650;
		letter-spacing: -0.05em;
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

	.caption {
		color: var(--muted);
		font-size: 0.88rem;
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

	.tax,
	.subject,
	.amount {
		margin: 0;
	}

	.tax {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--wine-dark);
	}

	.subject {
		margin-top: 0.2rem;
		font-family: var(--display);
		font-size: 1.25rem;
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.amount {
		font-family: var(--display);
		font-size: clamp(1.7rem, 2.5vw, 2.15rem);
		font-weight: 650;
		letter-spacing: -0.04em;
		line-height: 1;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem 1rem;
		margin: 0;
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

	.notice {
		display: grid;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		background: var(--danger-soft);
	}

	.notice-kicker,
	.notice-title,
	.notice-body {
		margin: 0;
	}

	.notice-kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--danger);
	}

	.notice-title {
		font-weight: 700;
	}

	.notice-body {
		color: var(--ink);
		white-space: pre-wrap;
	}

	.voucher {
		justify-self: start;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		font-weight: 700;
		text-decoration: none;
	}

	.voucher:hover {
		background: var(--wine-soft);
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

	.empty {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.4rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.empty .kicker {
		color: var(--sidebar-muted);
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

	@media (max-width: 980px) {
		.summary,
		dl {
			grid-template-columns: 1fr 1fr;
		}

		.summary article:nth-child(odd) {
			border-left: 0;
		}

		.summary article:nth-child(n + 3) {
			border-top: 1px solid var(--line);
		}
	}

	@media (max-width: 640px) {
		.summary,
		dl {
			grid-template-columns: 1fr;
		}

		.summary article {
			border-left: 0;
			border-top: 1px solid var(--line);
			min-height: 0;
		}

		.summary article:first-child {
			border-top: 0;
		}
	}
</style>
