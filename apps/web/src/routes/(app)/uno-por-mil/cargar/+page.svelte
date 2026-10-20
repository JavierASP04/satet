<script>
	import { untrack } from 'svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatCalendarDate, formatVed, taxFromExecuted, todayInCaracas } from '#lib/one-per-thousand.js';

	let { data, form } = $props();

	const today = todayInCaracas();

	/** @param {string} name @param {string} fallback */
	function field(name, fallback) {
		const value = form?.mode === 'single' ? form?.values?.[name] : null;
		return value == null || value === '' ? fallback : value;
	}

	let mode = $state(untrack(() => (form?.mode === 'batch' ? 'batch' : 'single')));
	let paymentOrderNumber = $state(untrack(() => field('paymentOrderNumber', '')));
	let entityName = $state(untrack(() => field('entityName', '')));
	let executedAmountVed = $state(untrack(() => field('executedAmountVed', '')));
	let executionDate = $state(untrack(() => field('executionDate', today)));
	let submitting = $state(false);

	/** @param {Record<string, string>} [source] */
	function blank(source) {
		return {
			paymentOrderNumber: source?.paymentOrderNumber ?? '',
			entityName: source?.entityName ?? '',
			executedAmountVed: source?.executedAmountVed ?? '',
			executionDate: source?.executionDate || today
		};
	}

	let rows = $state(
		untrack(() =>
			form?.mode === 'batch' && Array.isArray(form.orders) && form.orders.length > 0
				? form.orders.map((order) => blank(order))
				: [blank(), blank()]
		)
	);

	const singleTax = $derived(taxFromExecuted(executedAmountVed));
	const batchTax = $derived(
		rows.reduce((sum, row) => {
			const tax = taxFromExecuted(row.executedAmountVed);
			return tax == null ? sum : sum + tax;
		}, 0)
	);
	const batchCount = $derived(rows.filter((row) => taxFromExecuted(row.executedAmountVed) != null).length);
	const canLoad = $derived(Boolean(data.taxpayer?.isApproved));
	const orderLabel = $derived(paymentOrderNumber.trim() || 'Sin número');
	const entityLabel = $derived(entityName.trim() || 'Nueva orden');

	/** @param {number} index @param {string} key @param {string} value */
	function updateRow(index, key, value) {
		rows[index] = { ...rows[index], [key]: value };
	}
</script>

<Screen
	module="03"
	title="Cargar órdenes de pago"
	description="Cada orden retiene la milésima del monto ejecutado. El resumen se actualiza con lo que indicas."
	ready
>
	{#if !data.taxpayer}
		<Alert>Esta cuenta no tiene un expediente de contribuyente.</Alert>
	{:else if !canLoad}
		<Alert tone="warn">
			El expediente debe estar aprobado para registrar retenciones. Recaudación todavía no lo ha aprobado.
		</Alert>
	{:else}
		<div class="composer">
			<div class="modes" role="tablist" aria-label="Tipo de carga">
				<button type="button" role="tab" aria-selected={mode === 'single'} onclick={() => (mode = 'single')}>
					<span>Una orden</span>
					<strong>Individual</strong>
				</button>
				<button type="button" role="tab" aria-selected={mode === 'batch'} onclick={() => (mode = 'batch')}>
					<span>Varias órdenes</span>
					<strong>Hasta 100</strong>
				</button>
			</div>
			{#if form?.message}
				<Alert>{form.message}</Alert>
			{/if}

			{#if mode === 'single'}
				<div class="board">
					<section class="editor">
						<Form
							method="POST"
							action="?/single"
							submit={() => {
								submitting = true;
								return async ({ update }) => {
									await update();
									submitting = false;
								};
							}}
						>
							<fieldset>
								<legend>Orden</legend>
								<div class="fields">
									<TextField
										label="Número de orden"
										name="paymentOrderNumber"
										required
										maxlength="100"
										placeholder="OP-2026-001"
										value={paymentOrderNumber}
										oninput={(event) => (paymentOrderNumber = event.currentTarget.value)}
									/>
									<TextField
										label="Ente o banco"
										name="entityName"
										required
										maxlength="255"
										placeholder="Alcaldía de Valera"
										value={entityName}
										oninput={(event) => (entityName = event.currentTarget.value)}
									/>
								</div>
							</fieldset>
							<fieldset>
								<legend>Ejecución</legend>
								<div class="pair">
									<TextField
										label="Monto ejecutado (VED)"
										name="executedAmountVed"
										type="number"
										min="0.01"
										step="0.01"
										required
										value={executedAmountVed}
										oninput={(event) => (executedAmountVed = event.currentTarget.value)}
									/>
									<TextField
										label="Fecha de ejecución"
										name="executionDate"
										type="date"
										max={today}
										required
										value={executionDate}
										oninput={(event) => (executionDate = event.currentTarget.value)}
									/>
								</div>
							</fieldset>
							<div class="actions">
								<Button disabled={submitting}>{submitting ? 'Guardando…' : 'Registrar orden'}</Button>
								<Button href="/uno-por-mil" variant="ghost">Volver</Button>
							</div>
						</Form>
					</section>
					<aside class="slip" aria-live="polite">
						<p class="kicker">Retención</p>
						<h2>{entityLabel}</h2>
						<p class="status" class:wait={singleTax == null}>{singleTax == null ? 'Incompleta' : 'Lista'}</p>
						<dl>
							<div>
								<dt>Orden</dt>
								<dd>{orderLabel}</dd>
							</div>
							<div>
								<dt>Ejecutado</dt>
								<dd>{singleTax != null ? formatVed(Number(executedAmountVed)) : '—'}</dd>
							</div>
							<div>
								<dt>Fecha</dt>
								<dd>{formatCalendarDate(executionDate)}</dd>
							</div>
							<div>
								<dt>Divisor</dt>
								<dd>1.000</dd>
							</div>
						</dl>
						<div class="total">
							<span>Impuesto 1 x 1000</span>
							<strong>{singleTax != null ? formatVed(singleTax) : '—'}</strong>
							{#if singleTax != null}
								<p>{formatVed(Number(executedAmountVed))} / 1.000</p>
							{:else}
								<p>Indica el monto ejecutado para ver la retención.</p>
							{/if}
						</div>
						<p class="note">El servidor recalcula el impuesto al guardar.</p>
					</aside>
				</div>
			{:else}
				<div class="board">
					<section class="editor">
						<Form
							method="POST"
							action="?/batch"
							submit={() => {
								submitting = true;
								return async ({ update }) => {
									await update();
									submitting = false;
								};
							}}
						>
							<div class="lines">
								{#each rows as row, index (index)}
									{@const tax = taxFromExecuted(row.executedAmountVed)}
									<article class="line">
										<div class="line-head">
											<p><span class="index">{index + 1}</span> Orden {index + 1}</p>
											<div class="line-tools">
												{#if tax != null}
													<span class="chip">{formatVed(tax)}</span>
												{/if}
												{#if rows.length > 1}
													<button
														type="button"
														onclick={() => (rows = rows.filter((_, item) => item !== index))}
													>
														Quitar
													</button>
												{/if}
											</div>
										</div>
										<div class="pair">
											<TextField
												label="Número de orden"
												name="paymentOrderNumber"
												maxlength="100"
												placeholder="OP-2026-001"
												value={row.paymentOrderNumber}
												oninput={(event) => updateRow(index, 'paymentOrderNumber', event.currentTarget.value)}
											/>
											<TextField
												label="Ente o banco"
												name="entityName"
												maxlength="255"
												placeholder="Alcaldía de Valera"
												value={row.entityName}
												oninput={(event) => updateRow(index, 'entityName', event.currentTarget.value)}
											/>
											<TextField
												label="Monto ejecutado (VED)"
												name="executedAmountVed"
												type="number"
												min="0.01"
												step="0.01"
												value={row.executedAmountVed}
												oninput={(event) => updateRow(index, 'executedAmountVed', event.currentTarget.value)}
											/>
											<TextField
												label="Fecha de ejecución"
												name="executionDate"
												type="date"
												max={today}
												value={row.executionDate}
												oninput={(event) => updateRow(index, 'executionDate', event.currentTarget.value)}
											/>
										</div>
									</article>
								{/each}
							</div>
							<button
								type="button"
								class="add"
								disabled={rows.length >= 100}
								onclick={() => (rows = [...rows, blank()])}
							>
								Agregar orden
							</button>
							<div class="actions">
								<Button disabled={submitting}>{submitting ? 'Guardando…' : 'Registrar órdenes'}</Button>
								<Button href="/uno-por-mil" variant="ghost">Volver</Button>
							</div>
						</Form>
					</section>
					<aside class="slip" aria-live="polite">
						<p class="kicker">Carga</p>
						<h2>{batchCount > 0 ? `${batchCount} con monto` : 'Sin montos'}</h2>
						<p class="status" class:wait={batchCount === 0}>
							{batchCount === 0 ? 'Incompleta' : 'Lista'}
						</p>
						<dl>
							<div>
								<dt>En el formulario</dt>
								<dd>{rows.length}</dd>
							</div>
							<div>
								<dt>Con monto</dt>
								<dd>{batchCount}</dd>
							</div>
							<div>
								<dt>Tope</dt>
								<dd>100</dd>
							</div>
						</dl>
						<div class="total">
							<span>Impuesto acumulado</span>
							<strong>{batchCount > 0 ? formatVed(batchTax) : '—'}</strong>
							<p>
								{batchCount === 1
									? '1 orden entra en la suma.'
									: `${batchCount} órdenes entran en la suma.`}
							</p>
						</div>
						<p class="note">Cada fila se calcula por separado. El servidor recalcula al guardar.</p>
					</aside>
				</div>
			{/if}
		</div>
	{/if}
</Screen>

<style>
	.composer {
		display: grid;
		gap: 0.85rem;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 16rem));
		gap: 0.6rem;
	}

	.modes button {
		display: grid;
		gap: 0.15rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: #fff;
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}

	.modes button[aria-selected='true'] {
		border-color: var(--wine);
		background: var(--wine-soft);
	}

	.modes button:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--wine-soft);
	}

	.modes span {
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.modes strong {
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 650;
		letter-spacing: -0.04em;
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

	.fields,
	.lines {
		display: grid;
		gap: 0.85rem;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
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
		font-variant-numeric: tabular-nums;
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
		overflow-wrap: anywhere;
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

	.status.wait {
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
		overflow-wrap: anywhere;
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
		.board,
		.modes {
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
