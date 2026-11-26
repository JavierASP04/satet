<script>
	import { TAX_TYPES } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { TAX_LABELS } from '#lib/payments.js';

	let { data, form } = $props();

	const taxes = [
		{ value: TAX_TYPES.MINERO, label: 'Impuesto minero' },
		{ value: TAX_TYPES.UN_POR_MIL, label: 'Impuesto 1 x 1000' },
		{ value: TAX_TYPES.TIMBRE_FISCAL, label: 'Timbre fiscal' }
	];
	const order = [TAX_TYPES.MINERO, TAX_TYPES.UN_POR_MIL, TAX_TYPES.TIMBRE_FISCAL];

	let bankName = $state('');
	let accountNumber = $state('');
	let accountType = $state(TAX_TYPES.MINERO);
	let submitting = $state(false);

	const groups = $derived(
		order.map((type) => ({
			type,
			label: TAX_LABELS[type] ?? type,
			rows: (data.accounts ?? []).filter((account) => account.accountType === type)
		}))
	);

	$effect(() => {
		if (!form) return;
		if (form.ok) {
			bankName = '';
			accountNumber = '';
			accountType = TAX_TYPES.MINERO;
			return;
		}
		if (form.values) {
			bankName = form.values.bankName ?? '';
			accountNumber = form.values.accountNumber ?? '';
			accountType = form.values.accountType || TAX_TYPES.MINERO;
		}
	});

	/** @param {string | null | undefined} value */
	function spaced(value) {
		return String(value ?? '').replace(/(\d{4})(?=\d)/g, '$1 ');
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function onNumber(event) {
		accountNumber = event.currentTarget.value.replace(/\D/g, '').slice(0, 20);
	}
</script>

<Screen
	module="07"
	title="Cuentas institucionales"
	description="Cuentas donde se transfiere minería, el 1 x 1000 y los timbres. El alta queda activa de inmediato."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : form.tone === 'warn' ? 'warn' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert tone={data.forbidden ? 'warn' : 'danger'}>{data.error}</Alert>
		{/if}

		{#if !data.forbidden}
			<section class="summary" aria-label="Cuentas por tributo">
				<article>
					<p class="kicker">Activas</p>
					<p class="figure">{data.accounts.length}</p>
					<p class="caption">
						{data.accounts.length === 1 ? 'cuenta institucional' : 'cuentas institucionales'}
					</p>
				</article>
				{#each groups as group (group.type)}
					<article>
						<p class="kicker">{group.label}</p>
						<p class="figure">{group.rows.length}</p>
						<p class="caption">{group.rows.length === 1 ? 'cuenta' : 'cuentas'}</p>
					</article>
				{/each}
			</section>

			<section class="board">
				<div class="editor">
					<p class="kicker">Nueva cuenta</p>
					<h2>Registrar destino</h2>
					<p class="hint">
						El titular queda a nombre de la Gobernación. El número tiene 20 dígitos y no se puede repetir.
					</p>
					<Form
						method="POST"
						submit={() => {
							submitting = true;
							return async ({ update }) => {
								await update();
								submitting = false;
							};
						}}
					>
						<TextField
							label="Banco"
							name="bankName"
							required
							minlength="3"
							maxlength="100"
							value={bankName}
							oninput={(event) => (bankName = event.currentTarget.value)}
						/>
						<TextField
							label="Número de cuenta"
							name="accountNumber"
							required
							inputmode="numeric"
							autocomplete="off"
							minlength="20"
							maxlength="20"
							pattern={'\\d{20}'}
							title="20 dígitos"
							value={accountNumber}
							oninput={onNumber}
						/>
						<SelectField
							label="Tributo"
							name="accountType"
							required
							options={taxes}
							value={accountType}
							onchange={(event) => (accountType = event.currentTarget.value)}
						/>
						<div class="actions">
							<Button disabled={submitting}>
								{submitting ? 'Registrando…' : 'Registrar cuenta'}
							</Button>
						</div>
					</Form>
				</div>
				<aside>
					<p class="kicker">Uso</p>
					<h2>Dónde aparece</h2>
					<ul>
						<li>Minería y regalías en dinero usan las cuentas del tributo minero.</li>
						<li>El 1 x 1000 usa solo las de ese tributo.</li>
						<li>Los timbres usan las de timbre fiscal.</li>
					</ul>
				</aside>
			</section>

			{#each groups as group (group.type)}
				<section class="branch">
					<header>
						<h2>{group.label}</h2>
						<p>{group.rows.length === 0 ? 'Sin cuenta activa' : `${group.rows.length} activa${group.rows.length === 1 ? '' : 's'}`}</p>
					</header>
					{#if group.rows.length === 0}
						<p class="missing">Todavía no hay una cuenta activa para este tributo. Los pagos de ese ramo no tienen destino.</p>
					{:else}
						<ul class="cards">
							{#each group.rows as account (account.id)}
								<li>
									<p class="bank">{account.bankName}</p>
									<p class="number">{spaced(account.accountNumber)}</p>
									<p class="holder">{account.holderName || 'Gobernación del Estado Trujillo'}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/each}
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
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
	.hint,
	.holder,
	.missing,
	aside p,
	.branch header p {
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
	.summary article:first-child .caption,
	aside .kicker {
		color: var(--sidebar-muted);
	}

	.figure {
		margin: 0.15rem 0 0;
		font-family: var(--display);
		font-size: clamp(2rem, 3vw, 2.6rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.caption {
		color: var(--muted);
		font-size: 0.88rem;
	}

	.board {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(16rem, 0.8fr);
		gap: 0.9rem;
	}

	.editor,
	aside,
	.branch {
		padding: 1.2rem 1.25rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	aside {
		background:
			radial-gradient(280px 140px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	h2 {
		margin: 0.35rem 0 0;
		font-family: var(--display);
		font-size: 1.55rem;
		letter-spacing: -0.03em;
	}

	.hint {
		margin-top: 0.4rem;
		color: var(--muted);
	}

	.editor :global(form) {
		margin-top: 1rem;
	}

	.actions {
		display: flex;
	}

	aside ul {
		display: grid;
		gap: 0.7rem;
		margin: 0.9rem 0 0;
		padding: 0;
		list-style: none;
	}

	aside li {
		padding-top: 0.7rem;
		border-top: 1px solid rgb(255 255 255 / 0.12);
	}

	.branch header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
		margin-bottom: 0.9rem;
	}

	.branch header p,
	.missing,
	.holder {
		color: var(--muted);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cards li {
		display: grid;
		gap: 0.25rem;
		padding: 1rem 1rem 1rem 1.1rem;
		border: 1px solid var(--line);
		border-left: 4px solid var(--wine);
		border-radius: 1.15rem;
		background: var(--canvas);
	}

	.bank,
	.number {
		margin: 0;
	}

	.bank {
		font-weight: 700;
	}

	.number {
		font-family: var(--display);
		font-size: 1.2rem;
		letter-spacing: 0.04em;
	}

	@media (max-width: 980px) {
		.summary,
		.board {
			grid-template-columns: 1fr;
		}

		.summary article {
			border-left: 0;
			border-top: 1px solid var(--line);
		}

		.summary article:first-child {
			border-top: 0;
		}
	}
</style>
