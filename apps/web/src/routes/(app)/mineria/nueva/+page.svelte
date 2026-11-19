<script>
	import { untrack } from 'svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import PaymentFields from '#lib/components/PaymentFields.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import {
		ACTIVITY_OPTIONS,
		isExtemporaneousSelection,
		money,
		monthName,
		periodLabel,
		previousPeriod,
		rateFor
	} from '#lib/mining.js';

	let { data, form } = $props();

	const expected = previousPeriod();
	const years = Array.from({ length: 6 }, (_, index) => expected.year - index);
	const months = Array.from({ length: 12 }, (_, index) => ({
		value: String(index + 1),
		label: monthName(index + 1)
	}));
	const activities = ACTIVITY_OPTIONS.map((option) => ({
		value: option.value,
		label: `${option.label} (${rateFor(option.value)}%)`
	}));

	/** @param {string} name @param {string} fallback */
	function field(name, fallback) {
		const value = form?.values?.[name];
		return value == null || value === '' ? fallback : value;
	}

	/** @param {Record<string, string>} [source] */
	function blankLine(source) {
		return {
			activityType: source?.activityType || ACTIVITY_OPTIONS[0].value,
			materialType: source?.materialType || '',
			volumeCubicMeters: source?.volumeCubicMeters || '',
			commercialValuePerUnit: source?.commercialValuePerUnit || ''
		};
	}

	let periodYear = $state(untrack(() => field('periodYear', String(expected.year))));
	let periodMonth = $state(untrack(() => field('periodMonth', String(expected.month))));
	let lines = $state(
		untrack(() =>
			Array.isArray(form?.lines) && form.lines.length > 0
				? form.lines.map((line) => blankLine(line))
				: [blankLine()]
		)
	);
	let submitting = $state(false);

	/** @param {number} index @param {string} key @param {string} value */
	function updateLine(index, key, value) {
		lines[index] = { ...lines[index], [key]: value };
	}

	/** @param {{ activityType: string, volumeCubicMeters: string, commercialValuePerUnit: string }} line */
	function lineEstimate(line) {
		const rate = rateFor(line.activityType);
		const volumeAmount = Number(line.volumeCubicMeters);
		const unitPrice = Number(line.commercialValuePerUnit);
		if (!rate || !(volumeAmount > 0) || !(unitPrice > 0)) return null;
		return Math.round(((volumeAmount * unitPrice * rate) / 100) * 100) / 100;
	}

	const estimate = $derived(
		lines.reduce((sum, line) => {
			const value = lineEstimate(line);
			return value == null ? sum : sum + value;
		}, 0)
	);
	const estimatedCount = $derived(lines.filter((line) => lineEstimate(line) != null).length);
	const late = $derived(isExtemporaneousSelection(Number(periodYear), Number(periodMonth)));
	const canDeclare = $derived(Boolean(data.taxpayer?.isApproved));
</script>

<Screen
	module="02"
	title="Nueva declaración minera"
	description="Varios materiales en una misma declaración. El mes anterior se declara del día 1 al 10."
	ready
>
	{#if !data.taxpayer}
		<Alert>Esta cuenta no tiene un expediente de contribuyente.</Alert>
	{:else if !canDeclare}
		<Alert tone="warn">
			El expediente debe estar aprobado para presentar declaraciones. El administrador todavía no lo
			ha aprobado.
		</Alert>
	{:else}
		<div class="composer">
			{#if form?.message}
				<Alert>{form.message}</Alert>
			{/if}
			<div class="board">
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
							<legend>Período</legend>
							<div class="pair">
								<SelectField
									label="Año"
									name="periodYear"
									required
									options={years.map((year) => ({ value: String(year), label: String(year) }))}
									value={periodYear}
									onchange={(event) => (periodYear = event.currentTarget.value)}
								/>
								<SelectField
									label="Mes"
									name="periodMonth"
									required
									options={months}
									value={periodMonth}
									onchange={(event) => (periodMonth = event.currentTarget.value)}
								/>
							</div>
						</fieldset>

						<fieldset>
							<legend>Materiales</legend>
							<div class="lines">
								{#each lines as line, index (index)}
									{@const lineTotal = lineEstimate(line)}
									<article class="line">
										<div class="line-head">
											<p><span class="index">{index + 1}</span> Material {index + 1}</p>
											<div class="line-tools">
												{#if lineTotal != null}
													<span class="chip">{money(lineTotal)}</span>
												{/if}
												{#if lines.length > 1}
													<button
														type="button"
														onclick={() => (lines = lines.filter((_, item) => item !== index))}
													>
														Quitar
													</button>
												{/if}
											</div>
										</div>
										<SelectField
											label="Actividad"
											name="activityType"
											required
											options={activities}
											value={line.activityType}
											onchange={(event) =>
												updateLine(index, 'activityType', event.currentTarget.value)}
										/>
										<TextField
											label="Material"
											name="materialType"
											required
											maxlength="100"
											placeholder="Arena, grava, bloques…"
											value={line.materialType}
											oninput={(event) =>
												updateLine(index, 'materialType', event.currentTarget.value)}
										/>
										<div class="pair">
											<TextField
												label="Volumen (m³)"
												name="volumeCubicMeters"
												type="number"
												min="0.01"
												step="0.01"
												required
												value={line.volumeCubicMeters}
												oninput={(event) =>
													updateLine(index, 'volumeCubicMeters', event.currentTarget.value)}
											/>
											<TextField
												label="Valor comercial por m³ (VED)"
												name="commercialValuePerUnit"
												type="number"
												min="0.01"
												step="0.01"
												required
												value={line.commercialValuePerUnit}
												oninput={(event) =>
													updateLine(index, 'commercialValuePerUnit', event.currentTarget.value)}
											/>
										</div>
									</article>
								{/each}
							</div>
							<button
								type="button"
								class="add"
								disabled={lines.length >= 30}
								onclick={() => (lines = [...lines, blankLine()])}
							>
								Agregar material
							</button>
						</fieldset>

						<PaymentFields
							accounts={data.accounts ?? []}
							reference={field('bankReferenceNumber', '')}
							accountId={field('bankAccountId', '')}
						/>

						<div class="actions">
							<Button disabled={submitting}
								>{submitting ? 'Guardando…' : 'Presentar declaración'}</Button
							>
							<Button href="/mineria" variant="ghost">Volver</Button>
						</div>
					</Form>
				</section>

				<aside class="slip" aria-live="polite">
					<p class="kicker">Resumen</p>
					<h2>{periodLabel(Number(periodYear), Number(periodMonth))}</h2>
					<p class="status" class:late>
						{late ? 'Fuera de tiempo' : 'En término'}
					</p>
					<dl>
						<div>
							<dt>Materiales</dt>
							<dd>{lines.length}</dd>
						</div>
						<div>
							<dt>Con monto</dt>
							<dd>{estimatedCount}</dd>
						</div>
					</dl>
					<div class="total">
						<span>Total estimado</span>
						<strong>{estimatedCount > 0 ? money(estimate) : '—'}</strong>
						<p>Cada material usa su alícuota. El servidor recalcula al guardar.</p>
					</div>
					{#if late}
						<p class="late-banner">Fuera de tiempo</p>
					{/if}
					<p class="note">
						{#if late}
							Esta presentación queda fuera del lapso del día 1 al 10. No se calcula una multa.
						{:else}
							Este período está dentro de los primeros 10 días del mes.
						{/if}
						Sin comprobante y referencia la declaración no se envía.
					</p>
				</aside>
			</div>
		</div>
	{/if}
</Screen>

<style>
	.composer {
		display: grid;
		gap: 0.85rem;
	}

	.board {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(16.5rem, 0.75fr);
		gap: 0.85rem;
		align-items: start;
	}

	.editor,
	.slip {
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.editor {
		padding: 1.2rem 1.25rem 1.25rem;
	}

	fieldset {
		margin: 0;
		padding: 0 0 1.15rem;
		border: 0;
		border-bottom: 1px solid var(--line);
	}

	fieldset + fieldset {
		margin-top: 1.15rem;
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

	.lines {
		display: grid;
		gap: 0.85rem;
	}

	.line {
		display: grid;
		gap: 0.8rem;
		padding: 0.95rem;
		border: 1px solid var(--line);
		border-radius: 1.1rem;
		background: #fff;
	}

	.line-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.line-head p {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0;
		font-weight: 700;
	}

	.index {
		display: inline-grid;
		place-items: center;
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 999px;
		background: var(--wine-deep);
		color: #fff;
		font-size: 0.78rem;
	}

	.line-tools {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.chip {
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.line-head button,
	.add {
		border: 0;
		background: transparent;
		color: var(--wine-dark);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.add {
		width: 100%;
		margin-top: 0.85rem;
		padding: 0.85rem 1rem;
		border: 1px dashed var(--wine);
		border-radius: 1rem;
		background: var(--wine-soft);
	}

	.add:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.late-banner {
		margin: 0;
		color: #9b1c1c;
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.15rem;
	}

	.slip {
		position: sticky;
		top: 1rem;
		display: grid;
		gap: 0.85rem;
		padding: 1.2rem 1.15rem 1.15rem;
	}

	.kicker {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		font-size: 1.7rem;
	}

	.status {
		justify-self: start;
		margin: 0;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		background: var(--ok-soft);
		color: var(--ok);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.status.late {
		background: var(--warning-soft);
		color: var(--warning);
	}

	dl {
		display: grid;
		gap: 0.7rem;
		margin: 0;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
		font-weight: 650;
		text-align: right;
	}

	.total {
		display: grid;
		gap: 0.2rem;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		background: var(--wine-deep);
		color: #fff;
	}

	.total span,
	.total p {
		margin: 0;
		color: var(--sidebar-muted);
		font-size: 0.82rem;
	}

	.total strong {
		font-family: var(--display);
		font-size: 1.7rem;
		font-weight: 650;
		letter-spacing: -0.045em;
	}

	.note {
		margin: 0;
		color: var(--muted);
		font-size: 0.88rem;
	}

	@media (max-width: 980px) {
		.board {
			grid-template-columns: 1fr;
		}

		.slip {
			position: static;
		}
	}

	@media (max-width: 640px) {
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
