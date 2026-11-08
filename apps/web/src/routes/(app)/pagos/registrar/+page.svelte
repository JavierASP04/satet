<script>
	import { untrack } from 'svelte';
	import { TAX_TYPES } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { todayInCaracas } from '#lib/one-per-thousand.js';
	import { TAX_LABELS, formatVedText } from '#lib/payments.js';

	let { data, form } = $props();

	const taxes = [
		{ value: TAX_TYPES.MINERO, label: 'Impuesto minero' },
		{ value: TAX_TYPES.UN_POR_MIL, label: 'Impuesto 1 x 1000' },
		{ value: TAX_TYPES.TIMBRE_FISCAL, label: 'Timbre fiscal' }
	];
	const today = todayInCaracas();
	const canPay = $derived(Boolean(data.taxpayer?.isApproved));

	let taxType = $state(untrack(() => form?.values?.taxType || data.prefill?.taxType || TAX_TYPES.MINERO));
	let obligation = $state(untrack(() => form?.values?.obligation || data.prefill?.obligation || ''));
	let amount = $state(untrack(() => form?.values?.amountPaidVed || data.prefill?.amount || ''));
	let accountId = $state(untrack(() => form?.values?.bankAccountId || ''));
	let originBank = $state(untrack(() => form?.values?.originBank || ''));
	let reference = $state(untrack(() => form?.values?.bankReferenceNumber || ''));
	let paymentDate = $state(untrack(() => form?.values?.paymentDate || today));
	let voucherName = $state('');
	let submitting = $state(false);

	const obligationOptions = $derived([
		{ value: '', label: 'Sin obligación asociada' },
		...data.obligations.map((item) => ({ value: item.key, label: item.label }))
	]);
	const accountOptions = $derived(
		data.accounts
			.filter((account) => account.accountType === taxType && account.isActive !== false)
			.map((account) => ({
				value: account.id,
				label: `${account.bankName} · ${account.accountNumber}`
			}))
	);
	const accountValue = $derived(
		accountOptions.some((option) => option.value === accountId)
			? accountId
			: (accountOptions[0]?.value ?? '')
	);
	const chosen = $derived(data.obligations.find((item) => item.key === obligation) ?? null);
	const destination = $derived(data.accounts.find((account) => account.id === accountValue) ?? null);
	const previewAmount = $derived.by(() => {
		const raw = String(chosen ? chosen.amount : amount).replace(',', '.');
		const value = Number(raw);
		return Number.isFinite(value) && value > 0 ? formatVedText(value) : '—';
	});

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function onObligation(event) {
		const key = event.currentTarget.value;
		obligation = key;
		const item = data.obligations.find((row) => row.key === key);
		if (!item) {
			amount = '';
			return;
		}
		taxType = item.taxType;
		amount = item.amount;
		accountId = '';
	}

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function onTax(event) {
		taxType = event.currentTarget.value;
		if (chosen && chosen.taxType !== taxType) obligation = '';
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function onVoucher(event) {
		voucherName = event.currentTarget.files?.[0]?.name ?? '';
	}
</script>

<Screen
	module="05"
	title="Registrar pago"
	description="Transferencia contra la cuenta del tributo. Puedes asociarla a una declaración, una carga, una regalía o un timbre."
	ready
>
	<div class="stack">
		{#if !data.taxpayer}
			<Alert tone="warn">Esta cuenta no tiene un expediente de contribuyente.</Alert>
		{:else if !canPay}
			<Alert tone="warn">
				El expediente debe estar aprobado para registrar pagos. El administrador todavía no lo ha
				aprobado.
			</Alert>
		{/if}
		{#if data.accountsError}
			<Alert>{data.accountsError}</Alert>
		{/if}
		{#if data.listError}
			<Alert tone="warn">{data.listError}</Alert>
		{/if}
		{#if form?.message}
			<Alert tone={form.tone === 'warn' ? 'warn' : 'danger'}>{form.message}</Alert>
		{/if}

		{#if canPay}
			<section class="sheet">
				<Form
					method="POST"
					enctype="multipart/form-data"
					submit={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<div class="editor">
						<section class="block">
							<p class="step">1 · Obligación</p>
							<SelectField
								label="Qué estás pagando"
								name="obligation"
								options={obligationOptions}
								value={obligation}
								onchange={onObligation}
							/>
							<p class="note" class:locked={Boolean(chosen)}>
								{#if chosen}
									El monto queda en {formatVedText(chosen.amount)}, el total de esa obligación.
								{:else}
									Sin obligación, el pago queda registrado y tesorería lo concilia aparte.
								{/if}
							</p>
						</section>

						<section class="block">
							<p class="step">2 · Transferencia</p>
							{#if chosen}
								<input type="hidden" name="taxType" value={taxType} />
							{/if}
							<SelectField
								label="Tributo"
								name={chosen ? undefined : 'taxType'}
								options={taxes}
								value={taxType}
								onchange={onTax}
								disabled={Boolean(chosen)}
							/>
							{#if accountOptions.length === 0}
								<p class="warn">No hay una cuenta institucional activa para este tributo.</p>
							{:else}
								<SelectField
									label="Cuenta institucional"
									name="bankAccountId"
									required
									options={accountOptions}
									value={accountValue}
									onchange={(event) => (accountId = event.currentTarget.value)}
								/>
							{/if}
							<div class="pair">
								<TextField
									label="Banco de origen"
									name="originBank"
									required
									minlength="2"
									maxlength="100"
									value={originBank}
									oninput={(event) => (originBank = event.currentTarget.value)}
								/>
								<TextField
									label="Referencia"
									name="bankReferenceNumber"
									required
									minlength="4"
									maxlength="100"
									value={reference}
									oninput={(event) => (reference = event.currentTarget.value)}
								/>
								<TextField
									label="Fecha del pago"
									name="paymentDate"
									type="date"
									required
									max={today}
									value={paymentDate}
									oninput={(event) => (paymentDate = event.currentTarget.value)}
								/>
								<TextField
									label="Monto (VED)"
									name="amountPaidVed"
									type="number"
									required
									min="0.01"
									step="0.01"
									readonly={Boolean(chosen)}
									value={amount}
									oninput={(event) => (amount = event.currentTarget.value)}
								/>
							</div>
							<p class="note">
								La misma referencia no puede repetirse en la misma cuenta institucional.
							</p>
						</section>

						<section class="block">
							<p class="step">3 · Comprobante</p>
							<label class="file" class:filled={Boolean(voucherName)}>
								<span>{voucherName || 'JPEG, PNG o PDF, hasta 2 MB'}</span>
								<small>{voucherName ? 'Archivo listo' : 'Elige el comprobante de la transferencia'}</small>
								<input
									type="file"
									name="voucher"
									accept="image/jpeg,image/png,application/pdf"
									required
									onchange={onVoucher}
								/>
							</label>
						</section>

						<div class="actions">
							<Button disabled={submitting || accountOptions.length === 0}>
								{submitting ? 'Registrando…' : 'Registrar pago'}
							</Button>
							<Button href="/pagos/mios" variant="ghost">Mis pagos</Button>
						</div>
					</div>
				</Form>
				<aside class="slip">
					<p class="kicker">Vista del pago</p>
					<p class="total">{previewAmount}</p>
					<p class="formula">{TAX_LABELS[taxType] ?? taxType}</p>
					<dl>
						<div>
							<dt>Destino</dt>
							<dd>
								{#if destination}
									{destination.bankName}
									<span>{destination.accountNumber}</span>
								{:else}
									Elige la cuenta del tributo.
								{/if}
							</dd>
						</div>
						<div>
							<dt>Obligación</dt>
							<dd>{chosen ? chosen.label : 'Sin obligación asociada'}</dd>
						</div>
						<div>
							<dt>Referencia</dt>
							<dd>{reference || '—'}</dd>
						</div>
						<div>
							<dt>Fecha</dt>
							<dd>{paymentDate || '—'}</dd>
						</div>
					</dl>
				</aside>
			</section>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.sheet {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(16rem, 0.72fr);
		align-items: stretch;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.editor {
		display: grid;
		gap: 1.15rem;
		padding: 1.25rem 1.3rem 1.35rem;
	}

	.block {
		display: grid;
		gap: 0.75rem;
	}

	.step {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--wine-dark);
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.file {
		display: grid;
		gap: 0.15rem;
		padding: 1rem 1rem 0.95rem;
		border: 1px dashed var(--wine);
		border-radius: 1rem;
		background: var(--wine-soft);
		cursor: pointer;
	}

	.file.filled {
		border-style: solid;
		background: var(--ok-soft);
		border-color: rgb(6 118 71 / 0.35);
	}

	.file span {
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.file small {
		color: var(--muted);
	}

	.file input {
		margin-top: 0.55rem;
		max-width: 100%;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.warn,
	.note {
		margin: 0;
		font-size: 0.92rem;
	}

	.warn {
		color: var(--warning);
		font-weight: 650;
	}

	.note {
		padding: 0.7rem 0.85rem;
		border-radius: 0.85rem;
		background: #f4faf6;
		color: var(--muted);
	}

	.note.locked {
		background: var(--wine-soft);
		color: var(--wine-deep);
	}

	.slip {
		display: grid;
		align-content: start;
		gap: 0.45rem;
		padding: 1.45rem 1.25rem;
		background:
			radial-gradient(380px 180px at 100% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	.formula {
		margin: 0;
		color: var(--sidebar-muted);
	}

	.kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.total {
		margin: 0.2rem 0 0;
		font-family: var(--display);
		font-size: clamp(2rem, 3vw, 2.8rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.formula {
		margin-bottom: 0.6rem;
	}

	.slip dl {
		display: grid;
		gap: 0.85rem;
		margin: 0.4rem 0 0;
	}

	.slip dt {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--sidebar-muted);
	}

	.slip dd {
		margin: 0.15rem 0 0;
		font-weight: 650;
		overflow-wrap: anywhere;
	}

	.slip dd span {
		display: block;
		margin-top: 0.1rem;
		font-weight: 500;
		color: var(--sidebar-muted);
	}

	@media (max-width: 860px) {
		.sheet,
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
