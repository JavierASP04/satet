<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import {
		ACTIVITY_LABELS,
		ACTIVITY_OPTIONS,
		isExtemporaneousSelection,
		money,
		monthName,
		periodLabel,
		previousPeriod,
		rateFor,
		volume
	} from '#lib/mining.js';

	let { data, form } = $props();

	const expected = previousPeriod();
	const years = Array.from({ length: 6 }, (_, index) => expected.year - index);
	const months = Array.from({ length: 12 }, (_, index) => ({
		value: String(index + 1),
		label: monthName(index + 1)
	}));
	const activities = ACTIVITY_OPTIONS.map((option) => ({
		...option,
		rate: rateFor(option.value)
	}));

	/** @param {string} name @param {string} fallback */
	function field(name, fallback) {
		const value = form?.values?.[name];
		return value == null || value === '' ? fallback : value;
	}

	let periodYear = $state(field('periodYear', String(expected.year)));
	let periodMonth = $state(field('periodMonth', String(expected.month)));
	let activityType = $state(field('activityType', ACTIVITY_OPTIONS[0].value));
	let volumeCubicMeters = $state(field('volumeCubicMeters', ''));
	let commercialValuePerUnit = $state(field('commercialValuePerUnit', ''));
	let submitting = $state(false);

	const rate = $derived(rateFor(activityType));
	const volumeAmount = $derived(Number(volumeCubicMeters));
	const unitPrice = $derived(Number(commercialValuePerUnit));
	const estimate = $derived.by(() => {
		if (!rate || !(volumeAmount > 0) || !(unitPrice > 0)) return null;
		return Math.round(((volumeAmount * unitPrice * rate) / 100) * 100) / 100;
	});
	const late = $derived(isExtemporaneousSelection(Number(periodYear), Number(periodMonth)));
	const canDeclare = $derived(Boolean(data.taxpayer?.isApproved));
</script>

<Screen
	module="02"
	title="Nueva declaración minera"
	description="El mes anterior se declara del día 1 al 10. El resumen se actualiza con lo que indicas."
	ready
>
	{#if !data.taxpayer}
		<Alert>Esta cuenta no tiene un expediente de contribuyente.</Alert>
	{:else if !canDeclare}
		<Alert tone="warn">
			El expediente debe estar aprobado para presentar declaraciones. Recaudación todavía no lo ha aprobado.
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
							<legend>Actividad</legend>
							<div class="choices">
								{#each activities as activity (activity.value)}
									<label class:selected={activityType === activity.value}>
										<input type="radio" name="activityType" value={activity.value} bind:group={activityType} required />
										<span>{activity.label}</span>
										<strong>{activity.rate}%</strong>
									</label>
								{/each}
							</div>
						</fieldset>

						<fieldset>
							<legend>Mineral y base</legend>
							<div class="fields">
								<TextField
									label="Material"
									name="materialType"
									required
									maxlength="100"
									placeholder="Arena, grava, arcilla…"
									value={field('materialType', '')}
								/>
								<div class="pair">
									<TextField
										label="Volumen (m³)"
										name="volumeCubicMeters"
										type="number"
										min="0.01"
										step="0.01"
										required
										value={volumeCubicMeters}
										oninput={(event) => (volumeCubicMeters = event.currentTarget.value)}
									/>
									<TextField
										label="Valor comercial por m³ (VED)"
										name="commercialValuePerUnit"
										type="number"
										min="0.01"
										step="0.01"
										required
										value={commercialValuePerUnit}
										oninput={(event) => (commercialValuePerUnit = event.currentTarget.value)}
									/>
								</div>
							</div>
						</fieldset>

						<div class="actions">
							<Button disabled={submitting}>{submitting ? 'Guardando…' : 'Presentar declaración'}</Button>
							<Button href="/mineria" variant="ghost">Volver</Button>
						</div>
					</Form>
				</section>

				<aside class="slip" aria-live="polite">
					<p class="kicker">Resumen</p>
					<h2>{periodLabel(Number(periodYear), Number(periodMonth))}</h2>
					<p class="status" class:late>
						{late ? 'Extemporánea' : 'En término'}
					</p>
					<dl>
						<div>
							<dt>Actividad</dt>
							<dd>{ACTIVITY_LABELS[activityType] ?? activityType}</dd>
						</div>
						<div>
							<dt>Alícuota</dt>
							<dd>{rate}%</dd>
						</div>
						<div>
							<dt>Volumen</dt>
							<dd>{volumeAmount > 0 ? volume(volumeAmount) : '—'}</dd>
						</div>
						<div>
							<dt>Valor unitario</dt>
							<dd>{unitPrice > 0 ? money(unitPrice) : '—'}</dd>
						</div>
					</dl>
					<div class="total">
						<span>Subtotal estimado</span>
						<strong>{estimate != null ? money(estimate) : '—'}</strong>
						{#if estimate != null}
							<p>{volume(volumeAmount)} × {money(unitPrice)} × {rate}%</p>
						{:else}
							<p>Indica volumen y valor para estimar el subtotal.</p>
						{/if}
					</div>
					<p class="note">
						{#if late}
							Esta presentación queda fuera del lapso. La sanción se tramita por expediente.
						{:else}
							Este período está dentro de los primeros 10 días del mes.
						{/if}
						El servidor recalcula el subtotal al guardar.
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
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
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

	.fields {
		display: grid;
		gap: 0.85rem;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	.choices {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}

	.choices label {
		position: relative;
		display: grid;
		gap: 0.2rem;
		min-height: 4.6rem;
		padding: 0.85rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: #fff;
		cursor: pointer;
	}

	.choices label.selected {
		border-color: var(--wine);
		background: var(--wine-soft);
	}

	.choices label:focus-within {
		box-shadow: 0 0 0 4px var(--wine-soft);
	}

	.choices input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		border: 0;
	}

	.choices span {
		font-weight: 650;
	}

	.choices strong {
		color: var(--wine-dark);
		font-size: 1.15rem;
		letter-spacing: -0.04em;
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
		.pair,
		.choices {
			grid-template-columns: 1fr;
		}
	}
</style>
