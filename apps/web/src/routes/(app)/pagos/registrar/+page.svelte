<script>
	import { TAX_TYPES } from '@satet/shared';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { todayInCaracas } from '#lib/one-per-thousand.js';

	const taxes = [
		{ value: TAX_TYPES.MINERO, label: 'Impuesto minero' },
		{ value: TAX_TYPES.UN_POR_MIL, label: 'Impuesto 1 x 1000' },
		{ value: TAX_TYPES.TIMBRE_FISCAL, label: 'Timbre fiscal' }
	];

	const accounts = [
		{ value: TAX_TYPES.MINERO, label: 'Minería · 0102-0000-00-0000000001' },
		{ value: TAX_TYPES.UN_POR_MIL, label: '1 x 1000 · 0102-0000-00-0000000002' },
		{ value: TAX_TYPES.TIMBRE_FISCAL, label: 'Timbres · 0102-0000-00-0000000003' }
	];

	const today = todayInCaracas();
	let taxType = $state(TAX_TYPES.MINERO);
	let account = $state(TAX_TYPES.MINERO);
	let reference = $state('');
	let originBank = $state('');
	let paymentDate = $state(today);
	let amount = $state('');
	let noted = $state(false);

	const mismatch = $derived(taxType !== account);
	const accountLabel = $derived(accounts.find((item) => item.value === account)?.label ?? '');
</script>

<Screen
	module="05"
	title="Registrar pago"
	description="Transferencia y váucher contra la cuenta institucional del tributo."
	ready
>
	<div class="stack">
		<StaticNotice />
		<section class="sheet">
			<form
				onsubmit={(event) => {
					event.preventDefault();
					noted = !mismatch;
				}}
			>
				<div class="editor">
					<SelectField
						label="Tributo"
						name="taxType"
						options={taxes}
						value={taxType}
						onchange={(event) => (taxType = event.currentTarget.value)}
					/>
					<SelectField
						label="Cuenta institucional"
						name="account"
						options={accounts}
						value={account}
						onchange={(event) => (account = event.currentTarget.value)}
					/>
					{#if mismatch}
						<p class="warn">La cuenta tiene que corresponder al tributo elegido.</p>
					{/if}
					<div class="pair">
						<TextField
							label="Banco de origen"
							name="originBank"
							maxlength="100"
							placeholder="Banco de Venezuela"
							value={originBank}
							oninput={(event) => (originBank = event.currentTarget.value)}
						/>
						<TextField
							label="Referencia"
							name="reference"
							maxlength="100"
							placeholder="0099887766"
							value={reference}
							oninput={(event) => (reference = event.currentTarget.value)}
						/>
						<TextField
							label="Fecha del pago"
							name="paymentDate"
							type="date"
							max={today}
							value={paymentDate}
							oninput={(event) => (paymentDate = event.currentTarget.value)}
						/>
						<TextField
							label="Monto (VED)"
							name="amount"
							type="number"
							min="0.01"
							step="0.01"
							value={amount}
							oninput={(event) => (amount = event.currentTarget.value)}
						/>
					</div>
					<label class="file">
						<span>Váucher</span>
						<input type="file" name="voucher" accept="image/*,.pdf" />
					</label>
					<div class="actions">
						<Button>Registrar pago</Button>
					</div>
					{#if noted}
						<p class="note">Quedó solo en esta pantalla. No se registró el pago.</p>
					{/if}
				</div>
			</form>
			<aside class="slip">
				<p class="kicker">Destino</p>
				<p class="total">{accountLabel.split(' · ')[0]}</p>
				<p class="formula">Gobernación del Estado Trujillo · G-200001234</p>
			</aside>
		</section>
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.sheet {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(15rem, 0.7fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.editor {
		display: grid;
		gap: 0.85rem;
		padding: 1.25rem;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.file {
		display: grid;
		gap: 0.45rem;
	}

	.file span {
		font-size: 0.88rem;
		font-weight: 650;
	}

	.file input {
		padding: 0.7rem 0.8rem;
		border: 1px dashed var(--wine);
		border-radius: 0.85rem;
		background: var(--wine-soft);
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
		color: var(--muted);
	}

	.slip {
		display: grid;
		align-content: end;
		gap: 0.35rem;
		padding: 1.35rem 1.2rem;
		background:
			radial-gradient(380px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 62%),
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
		margin: 0;
		font-family: var(--display);
		font-size: clamp(1.8rem, 3vw, 2.4rem);
		font-weight: 650;
		letter-spacing: -0.04em;
		line-height: 1;
	}

	@media (max-width: 860px) {
		.sheet,
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
