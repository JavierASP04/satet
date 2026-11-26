<script>
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { hasPermission, PERMISSIONS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Form from '#lib/components/Form.svelte';
	import PaymentFields from '#lib/components/PaymentFields.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { caracasDate, money, STATUS_LABELS } from '#lib/mining.js';

	let { data, form } = $props();

	const yearNow = caracasDate().year;
	const years = Array.from({ length: 6 }, (_, index) => yearNow - index);
	const forms = [
		{ value: 'DINERO_TOTAL', label: 'Pago total en dinero' },
		{ value: 'DINERO_FRACCIONADO', label: 'Pago fraccionado' },
		{ value: 'ESPECIE', label: 'Pago en especie' }
	];
	const formLabels = Object.fromEntries(forms.map((option) => [option.value, option.label]));

	/** @param {string} name @param {string} fallback */
	function field(name, fallback) {
		const value = form?.values?.[name];
		return value == null || value === '' ? fallback : value;
	}

	let periodYear = $state(untrack(() => field('periodYear', String(yearNow))));
	let extractedSquareMeters = $state(untrack(() => field('extractedSquareMeters', '')));
	let submitting = $state(false);

	const canDeclare = $derived(Boolean(data.taxpayer?.isApproved));
	const canResolve = $derived(hasPermission(data.user?.role, PERMISSIONS.DECLARACIONES_RESOLVER));
	const isAdmin = $derived(data.user?.role === 'ADMIN_SISTEMA');
	const yearTaken = $derived(
		(data.royalties ?? []).some((royalty) => String(royalty.periodYear) === String(periodYear))
	);
</script>

<Screen
	module="02"
	title="Regalías mineras"
	description="Primero solicitas la regalía con los metros cuadrados. El pago aparece cuando el administrador indica la forma."
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
		{/if}

		{#if !data.taxpayer}
			<Alert>Esta cuenta no tiene un expediente de contribuyente.</Alert>
		{:else if !canDeclare}
			<Alert tone="warn">
				El expediente debe estar aprobado para declarar regalías. El administrador todavía no lo ha
				aprobado.
			</Alert>
		{:else}
			<section class="editor">
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
					<fieldset>
						<legend>Solicitud</legend>
						<div class="pair">
							<SelectField
								label="Año"
								name="periodYear"
								required
								options={years.map((year) => ({ value: String(year), label: String(year) }))}
								value={periodYear}
								onchange={(event) => (periodYear = event.currentTarget.value)}
							/>
							<TextField
								label="Metros cuadrados extraídos"
								name="extractedSquareMeters"
								type="number"
								min="0.01"
								step="0.01"
								required
								value={extractedSquareMeters}
								oninput={(event) => (extractedSquareMeters = event.currentTarget.value)}
							/>
						</div>
						{#if yearTaken}
							<Alert tone="warn">
								Ya hay una regalía declarada para {periodYear}. Una segunda del mismo año no se acepta.
							</Alert>
						{/if}
						<p class="note">
							El monto sale de los meses en los que ya declaraste extracción. El pago no se pide en este paso.
						</p>
					</fieldset>
					<div class="actions">
						<Button disabled={submitting}
							>{submitting ? 'Guardando…' : 'Presentar solicitud de regalía'}</Button
						>
					</div>
				</Form>
			</section>
		{/if}

		{#each (data.royalties ?? []).filter((royalty) => royalty.paymentForm && royalty.paymentForm !== 'ESPECIE' && !royalty.bankReferenceNumber && royalty.status === 'PENDIENTE') as royalty (royalty.id)}
			<section class="editor">
				<h2>Pago de la regalía {royalty.periodYear}</h2>
				<p class="note">
					{formLabels[royalty.paymentForm] ?? royalty.paymentForm}. Monto {money(royalty.amountVed)}.
				</p>
				<Form method="POST" action="?/pay" enctype="multipart/form-data">
					<input type="hidden" name="id" value={royalty.id} />
					<PaymentFields accounts={data.accounts ?? []} />
					<div class="actions">
						<Button>Registrar pago</Button>
					</div>
				</Form>
			</section>
		{/each}

		{#if isAdmin && data.pending?.length}
			<h2>Solicitudes sin forma de pago</h2>
			<DataTable>
				<thead>
					<tr>
						<th>Año</th>
						<th>Contribuyente</th>
						<th>m²</th>
						<th>Regalía</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.pending as royalty (royalty.id)}
						<tr>
							<td>{royalty.periodYear}</td>
							<td>{royalty.companyName ?? '—'}</td>
							<td>{royalty.extractedSquareMeters}</td>
							<td>{money(royalty.amountVed)}</td>
							<td>
								{#if !royalty.paymentForm}
									<form method="POST" action="?/instruct" use:enhance>
										<input type="hidden" name="id" value={royalty.id} />
										<select name="paymentForm" required>
											{#each forms as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
										<Button>Indicar forma de pago</Button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{/if}

		{#if data.royalties?.length}
			<DataTable>
				<thead>
					<tr>
						<th>Año</th>
						<th>Volumen</th>
						<th>Valor</th>
						<th>Forma</th>
						<th>Regalía</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.royalties as royalty (royalty.id)}
						<tr>
							<td>{royalty.periodYear}</td>
							<td>{royalty.volumeCubicMeters} m³</td>
							<td>{money(royalty.commercialValuePerUnit)}</td>
							<td>{formLabels[royalty.paymentForm] ?? royalty.paymentForm}</td>
							<td>{money(royalty.amountVed)}</td>
							<td>{STATUS_LABELS[royalty.status] ?? royalty.status}</td>
							<td>
								{#if royalty.status === 'VERIFICADO'}
									<a href="/mineria/regalias/{royalty.id}/planilla">Planilla</a>
								{:else if isAdmin && royalty.status === 'PENDIENTE' && !royalty.paymentForm}
									<form method="POST" action="?/instruct" use:enhance>
										<input type="hidden" name="id" value={royalty.id} />
										<select name="paymentForm" required>
											{#each forms as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
										<Button>Indicar forma de pago</Button>
									</form>
								{:else if canResolve && royalty.status === 'PENDIENTE' && royalty.paymentForm && (royalty.paymentForm === 'ESPECIE' || royalty.bankReferenceNumber)}
									<form method="POST" action="?/resolve" use:enhance>
										<input type="hidden" name="id" value={royalty.id} />
										<input type="hidden" name="decision" value="APROBAR" />
										<Button>Verificar</Button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else if !data.error}
			<section class="empty">
				<p class="kicker">Regalías</p>
				<h2>Sin regalías declaradas</h2>
				<p>Cuando presentes la del año, quedará aquí. Solo se admite una por año.</p>
			</section>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.editor {
		padding: 1.2rem 1.25rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
	}

	fieldset {
		display: grid;
		gap: 0.85rem;
		margin: 0 0 1rem;
		padding: 0 0 1rem;
		border: 0;
		border-bottom: 1px solid var(--line);
	}

	legend {
		margin-bottom: 0.8rem;
		padding: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	.actions {
		display: flex;
		margin-top: 1rem;
	}

	.empty {
		display: grid;
		gap: 0.35rem;
		padding: 1.4rem 1.35rem;
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.empty .kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--sidebar-muted);
	}

	.empty h2 {
		margin: 0;
		font-size: 1.7rem;
	}

	.empty p {
		margin: 0;
		max-width: 36rem;
		color: var(--sidebar-muted);
	}

	.note {
		margin: 0;
		color: var(--muted);
	}

	form {
		margin: 0;
	}

	@media (max-width: 640px) {
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
