<script>
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let { accounts = [], reference = '', accountId = '' } = $props();
	let selectedId = $state(accountId);
	let copied = $state(false);

	const options = $derived(
		accounts.map((account) => ({
			value: account.id,
			label: `${account.bankName} · ${account.accountNumber}`
		}))
	);
	const selected = $derived(
		accounts.find((account) => account.id === (selectedId || options[0]?.value)) ?? null
	);

	async function copyAccount() {
		if (!selected) return;
		const text = [selected.bankName, selected.accountNumber, selected.holderName]
			.filter(Boolean)
			.join('\n');
		await navigator.clipboard.writeText(text);
		copied = true;
	}
</script>

<fieldset>
	<legend>Pago</legend>
	<div class="fields">
		<TextField
			label="Número de referencia bancaria"
			name="bankReferenceNumber"
			required
			minlength="4"
			maxlength="100"
			value={reference}
		/>
		{#if options.length === 0}
			<p class="warn">No hay una cuenta institucional activa para este tributo.</p>
		{:else}
			<SelectField
				label="Cuenta institucional"
				name="bankAccountId"
				required
				{options}
				value={selectedId || options[0].value}
				onchange={(event) => {
					selectedId = event.currentTarget.value;
					copied = false;
				}}
			/>
			<button type="button" class="copy" onclick={copyAccount}>
				{copied ? 'Datos copiados' : 'Copiar datos'}
			</button>
		{/if}
		<label class="file">
			<span>Comprobante (JPEG, PNG o PDF, hasta 2 MB)</span>
			<input type="file" name="voucher" accept="image/jpeg,image/png,application/pdf" required />
		</label>
	</div>
</fieldset>

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.fields {
		display: grid;
		gap: 0.85rem;
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
		width: 100%;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 0.85rem;
		background: #fff;
	}

	.warn {
		margin: 0;
		color: var(--danger, #9b1c1c);
		font-size: 0.92rem;
	}

	.copy {
		justify-self: start;
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 0.7rem;
		background: #fff;
		cursor: pointer;
	}
</style>
