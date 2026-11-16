<script>
	import Alert from '#lib/components/Alert.svelte';
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

	const payment = $derived(data.payment);
	const fileKind = $derived(kind(payment));

	/** @param {{ voucherMediaType?: string, voucherFileName?: string } | null | undefined} row */
	function kind(row) {
		const type = String(row?.voucherMediaType ?? '').toLowerCase();
		if (type.startsWith('image/')) return 'image';
		if (type === 'application/pdf') return 'pdf';
		const file = String(row?.voucherFileName ?? '').toLowerCase();
		if (file.endsWith('.pdf')) return 'pdf';
		if (/\.(png|jpe?g|webp|gif)$/.test(file)) return 'image';
		return 'file';
	}

	/** @param {string | null | undefined} value */
	function account(value) {
		const digits = String(value ?? '').replace(/\D/g, '');
		if (digits.length !== 20) return String(value ?? '');
		return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
	}

	/** @param {string | null | undefined} iso */
	function when(iso) {
		if (!iso) return '';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('es-VE', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Caracas'
		}).format(date);
	}
</script>

<Screen
	module="05"
	title="Comprobante de pago"
	description="Recibo de la transferencia registrada. El archivo adjunto es el que cargó el contribuyente."
	ready
>
	{#if data.error}
		<Alert>{data.error}</Alert>
	{:else if payment}
		<div class="toolbar">
			<button type="button" class="print" onclick={() => history.back()}>Volver</button>
			<button type="button" class="print primary" onclick={() => window.print()}>Imprimir</button>
		</div>

		<article class="receipt">
			<header class="band">
				<img class="mark satet" src="/satet-sidebar.png" alt="SATET" />
				<img class="mark gov" src="/gobernacion-blanco.png" alt="Gobernación del Estado Trujillo" />
			</header>
			<div class="body">
				<div class="heading">
					<div>
						<h2>Comprobante de pago</h2>
						<p>Registro de la transferencia declarada ante el SATET.</p>
					</div>
					<span class="pill {paymentTone(payment.status)}">{paymentStatusLabel(payment.status)}</span>
				</div>
				<p class="amount">{formatVedText(payment.amountPaidVed)}</p>
				<figure class="voucher">
					<figcaption>
						<span>Imagen del comprobante</span>
						<a href="/pagos/{payment.id}/comprobante/archivo">Abrir archivo</a>
					</figcaption>
					{#if fileKind === 'image'}
						<img src="/pagos/{payment.id}/comprobante/archivo" alt="Imagen del comprobante de pago" />
					{:else if fileKind === 'pdf'}
						<iframe
							title="Imagen del comprobante de pago"
							src="/pagos/{payment.id}/comprobante/archivo#toolbar=0&navpanes=0&view=FitH"
						></iframe>
					{:else}
						<p class="missing">Este archivo no se puede mostrar aquí. Ábrelo para revisarlo.</p>
					{/if}
				</figure>
				<dl>
					<div>
						<dt>Contribuyente</dt>
						<dd>{payment.companyName}</dd>
					</div>
					<div>
						<dt>RIF</dt>
						<dd>{payment.rifNumber}</dd>
					</div>
					<div>
						<dt>Tributo</dt>
						<dd>{TAX_LABELS[payment.taxType] ?? payment.taxType}</dd>
					</div>
					<div>
						<dt>Obligación</dt>
						<dd>
							{payment.relatedKind
								? (SUBJECT_LABELS[payment.relatedKind] ?? payment.relatedKind)
								: 'Sin obligación asociada'}
						</dd>
					</div>
					<div>
						<dt>Fecha de pago</dt>
						<dd>{formatCalendarDate(payment.paymentDate)}</dd>
					</div>
					<div>
						<dt>Referencia</dt>
						<dd>{payment.bankReferenceNumber}</dd>
					</div>
					<div>
						<dt>Banco de origen</dt>
						<dd>{payment.originBank}</dd>
					</div>
					<div>
						<dt>Cuenta destino</dt>
						<dd>{payment.bankName} · {account(payment.accountNumber)}</dd>
					</div>
					{#if payment.verifiedAt}
						<div>
							<dt>Conciliado</dt>
							<dd>{when(payment.verifiedAt)}</dd>
						</div>
					{/if}
				</dl>
				{#if payment.notice}
					<section class="notice">
						<p>Aviso de tesorería</p>
						<h3>{payment.notice.subject}</h3>
						<p>{payment.notice.body}</p>
					</section>
				{:else if payment.rejectionReason}
					<section class="notice">
						<p>Motivo del rechazo</p>
						<h3>{payment.rejectionReason}</h3>
					</section>
				{/if}
			</div>
		</article>
	{/if}
</Screen>

<style>
	.toolbar {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
	}

	.print {
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.print.primary {
		border-color: transparent;
		background: var(--wine);
		color: #fff;
	}

	.receipt {
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 16px 40px rgb(15 46 34 / 0.06);
	}

	.band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1.35rem;
		background: var(--wine-deep);
		color: #f4faf6;
	}

	.band .mark {
		width: auto;
		max-height: none;
		object-fit: contain;
		border-radius: 0;
		background: transparent;
	}

	.band .satet {
		height: 4.4rem;
	}

	.band .gov {
		height: 2.7rem;
	}

	.body {
		display: grid;
		gap: 1rem;
		padding: 1.25rem 1.35rem 1.4rem;
	}

	.heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	h2,
	h3,
	.amount {
		margin: 0;
		font-family: var(--display);
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.heading p {
		margin: 0.25rem 0 0;
		color: var(--muted);
	}

	.voucher {
		margin: 0;
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: var(--canvas);
	}

	.voucher figcaption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
	}

	.voucher figcaption span {
		color: var(--wine-dark);
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.voucher figcaption a {
		color: var(--wine-dark);
		font-weight: 700;
	}

	.missing {
		margin: 0;
		color: var(--muted);
	}

	.amount {
		font-size: clamp(2rem, 4vw, 2.8rem);
		line-height: 1;
	}

	dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
		margin: 0;
	}

	dl div {
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 0.9rem;
		background: #fff;
	}

	dt {
		margin: 0;
		color: var(--wine-dark);
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.28rem 0 0;
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

	.notice {
		display: grid;
		gap: 0.25rem;
		padding: 0.9rem 1rem;
		border-radius: 0.95rem;
		background: var(--danger-soft, #fdeceb);
	}

	.notice p {
		margin: 0;
	}

	.notice p:first-child {
		color: var(--danger);
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	iframe {
		width: 100%;
		height: 32rem;
		border: 0;
		border-radius: 0.75rem;
		background: #fff;
	}

	img {
		display: block;
		width: 100%;
		max-height: 36rem;
		object-fit: contain;
		border-radius: 0.75rem;
		background: #fff;
	}

	@media (max-width: 720px) {
		dl,
		.heading,
		.band {
			display: grid;
		}
	}

	@page {
		size: A4 portrait;
		margin: 8mm;
	}

	@media print {
		:global(html),
		:global(body),
		:global(.shell),
		:global(.workspace),
		:global(main) {
			display: block;
			width: auto;
			max-width: none;
			height: auto !important;
			min-height: 0 !important;
			margin: 0;
			padding: 0;
			background: #fff !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		:global(aside),
		:global(.topbar),
		:global(.head),
		:global(.banner),
		.toolbar,
		.voucher figcaption {
			display: none !important;
		}

		.receipt {
			display: flex;
			flex-direction: column;
			width: 100%;
			height: 268mm;
			max-height: 268mm;
			overflow: hidden;
			border: 0;
			border-radius: 0;
			box-shadow: none;
			break-inside: avoid;
			page-break-inside: avoid;
			break-after: avoid;
			page-break-after: avoid;
		}

		.band,
		.heading {
			display: flex !important;
		}

		.band {
			flex: none;
			padding: 4mm 6mm;
			background: #0f2e22 !important;
			color: #f4faf6 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.band .mark {
			background: transparent !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.band .satet {
			height: 16mm;
		}

		.band .gov {
			height: 11mm;
		}

		.body {
			flex: 1;
			min-height: 0;
			display: grid;
			grid-template-rows: auto auto minmax(0, 1fr) auto;
			gap: 3mm;
			padding: 4mm 5mm 0;
		}

		h2 {
			font-size: 14pt;
		}

		.heading p {
			font-size: 9pt;
		}

		.amount {
			font-size: 18pt;
		}

		.voucher {
			min-height: 0;
			margin: 0;
			padding: 2mm;
			overflow: hidden;
		}

		.voucher img,
		.voucher iframe {
			display: block;
			width: 100%;
			height: 100%;
			max-height: none;
			object-fit: contain;
			border-radius: 0;
		}

		dl {
			display: grid !important;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 2mm;
		}

		dl div {
			padding: 1.5mm 2mm;
		}

		dt {
			font-size: 6.5pt;
		}

		dd {
			margin-top: 0.5mm;
			font-size: 8pt;
		}

		.notice {
			padding: 2mm;
		}

		.notice h3 {
			font-size: 10pt;
		}
	}
</style>
