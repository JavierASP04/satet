<script>
	import { untrack } from 'svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatCalendarDate, formatEur, formatRate, formatRegisteredAt, formatVed, vedFromEuros } from '#lib/bcv.js';
	import { stampStatusLabel } from '#lib/stamps.js';

	let { data, form } = $props();

	let query = $state('');
	let feeCode = $state(untrack(() => form?.feeCode ?? ''));
	let submitting = $state(false);

	const fees = $derived(data.fees ?? []);
	const canEmit = $derived(Boolean(data.taxpayer?.isApproved && data.rate));
	const selected = $derived(fees.find((fee) => fee.code === feeCode) ?? null);
	const preview = $derived(
		selected && data.rate ? vedFromEuros(selected.timesOfficialRate, data.rate.rateInVed) : null
	);

	const groups = $derived.by(() => {
		const needle = query.trim().toLocaleLowerCase('es');
		/** @type {Map<string, typeof data.fees>} */
		const byArticle = new Map();
		for (const fee of fees) {
			if (needle) {
				const haystack = `${fee.code} ${fee.article} ${fee.item} ${fee.concept}`.toLocaleLowerCase('es');
				if (!haystack.includes(needle)) continue;
			}
			const article = fee.article || '—';
			const rows = byArticle.get(article);
			if (rows) rows.push(fee);
			else byArticle.set(article, [fee]);
		}
		return [...byArticle.entries()].sort((left, right) => Number(left[0]) - Number(right[0]));
	});

	const visibleCount = $derived(groups.reduce((sum, [, fees]) => sum + fees.length, 0));
</script>

<Screen
	module="04"
	title="Comprar timbre fiscal"
	description="Elige un concepto del tabulador. Cada compra emite una unidad de esa fila."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}
		{#if data.feesError}
			<Alert>{data.feesError}</Alert>
		{/if}
		{#if !data.taxpayer}
			<Alert tone="warn">Esta cuenta no tiene un expediente de contribuyente.</Alert>
		{:else if !data.taxpayer.isApproved}
			<Alert tone="warn">
				El expediente debe estar aprobado para emitir timbres. El administrador todavía no lo ha
				aprobado.
			</Alert>
		{/if}
		{#if !data.rate && !data.error}
			<Alert tone="warn">Sin tasa vigente no se puede calcular ni emitir el timbre.</Alert>
		{/if}
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}

		{#if form?.ok && form.stamp}
			<section class="issued">
				<div>
					<p class="kicker">Timbre emitido</p>
					<h2>{form.stamp.concept}</h2>
					<p class="serial">{form.stamp.feeCode} · {form.stamp.uuid}</p>
					<dl>
						<div>
							<dt>Contribuyente</dt>
							<dd>{form.stamp.taxpayer}</dd>
						</div>
						<div>
							<dt>RIF</dt>
							<dd>{form.stamp.rif}</dd>
						</div>
						<div>
							<dt>Euros</dt>
							<dd>{formatEur(form.stamp.amountEur)}</dd>
						</div>
						<div>
							<dt>Bolívares</dt>
							<dd>{formatVed(Number(form.stamp.amountVed))}</dd>
						</div>
						<div>
							<dt>Tasa</dt>
							<dd>{formatRate(form.stamp.bcvRate)}</dd>
						</div>
						<div>
							<dt>Emitido</dt>
							<dd>{formatRegisteredAt(form.stamp.issuedAt)}</dd>
						</div>
						<div>
							<dt>Estado</dt>
							<dd>{stampStatusLabel(form.stamp.status)}</dd>
						</div>
					</dl>
					<div class="actions">
						<Button href="/timbres/{form.stamp.uuid}/pdf">Descargar PDF</Button>
						<Button href="/pagos/registrar?timbre={form.stamp.uuid}">Registrar el pago</Button>
						<Button href="/timbres" variant="ghost">Ver en mis timbres</Button>
					</div>
				</div>
				{#if form.qrDataUrl}
					<figure>
						<img src={form.qrDataUrl} alt="Código QR del timbre {form.stamp.uuid}" />
						<figcaption>El QR que el servicio incluye en el PDF.</figcaption>
					</figure>
				{/if}
			</section>
		{/if}

		{#if !data.feesError}
			<section class="sheet">
				<div class="editor">
					<TextField
						label="Buscar en el tabulador"
						name="query"
						placeholder="Artículo, código o concepto"
						value={query}
						oninput={(event) => (query = event.currentTarget.value)}
					/>
					<p class="count">
						{visibleCount === 1 ? '1 concepto' : `${visibleCount} conceptos`}
						{#if query.trim()}
							de {fees.length}
						{/if}
					</p>
					<div class="catalog" role="radiogroup" aria-label="Conceptos del tabulador">
						{#if visibleCount === 0}
							<p class="miss">Ningún concepto coincide con la búsqueda.</p>
						{:else}
							{#each groups as [article, fees] (article)}
								<section>
									<h3>Artículo {article}</h3>
									<div class="fees">
										{#each fees as fee (fee.code)}
											<label class:on={fee.code === feeCode}>
												<input type="radio" name="pick" value={fee.code} bind:group={feeCode} />
												<span class="code">{fee.code}</span>
												<span class="price">{formatEur(fee.timesOfficialRate)}</span>
												<span class="concept">{fee.concept}</span>
											</label>
										{/each}
									</div>
								</section>
							{/each}
						{/if}
					</div>
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
						<input type="hidden" name="feeCode" value={feeCode} />
						<div class="actions">
							<Button type="submit" disabled={!selected || !canEmit || submitting}>
								{submitting ? 'Emitiendo…' : 'Emitir timbre'}
							</Button>
							<Button href="/timbres" variant="ghost">Volver</Button>
						</div>
					</Form>
				</div>
				<aside class="slip" aria-live="polite">
					<p class="kicker">En bolívares</p>
					<p class="total">{preview != null ? formatVed(preview) : '—'}</p>
					{#if selected && data.rate && preview != null}
						<p class="formula">
							{formatEur(selected.timesOfficialRate)} × {formatRate(data.rate.rateInVed)}
						</p>
						<p class="chosen">{selected.concept}</p>
					{:else}
						<p class="formula">Elige un concepto del tabulador.</p>
					{/if}
					<dl>
						<div>
							<dt>Código</dt>
							<dd>{selected?.code ?? '—'}</dd>
						</div>
						<div>
							<dt>Tasa</dt>
							<dd>{data.rate ? formatRate(data.rate.rateInVed) : '—'}</dd>
						</div>
						<div>
							<dt>Vigencia</dt>
							<dd>{data.rate ? formatCalendarDate(data.rate.effectiveDate) : '—'}</dd>
						</div>
					</dl>
					<p class="hint">El monto que queda en el timbre es el que calcula el servicio al emitirlo.</p>
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

	.issued {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.25rem;
		align-items: start;
		padding: 1.35rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.issued h2 {
		margin: 0.15rem 0 0;
		font-size: 1.45rem;
	}

	.issued > div {
		display: grid;
		gap: 0.75rem;
		align-content: start;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.issued .kicker,
	.count,
	.miss {
		color: var(--muted);
	}

	.serial,
	.count,
	.miss,
	.hint {
		margin: 0;
	}

	.serial {
		color: var(--muted);
		font-size: 0.82rem;
		overflow-wrap: anywhere;
	}

	.issued dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.85rem;
		margin: 0.9rem 0 0;
	}

	.issued figure {
		margin: 0;
	}

	.issued img {
		display: block;
		width: 9.5rem;
		height: auto;
		padding: 0.35rem;
		border-radius: 0.85rem;
		background: #fff;
	}

	.issued figcaption {
		max-width: 9.5rem;
		margin-top: 0.4rem;
		color: var(--muted);
		font-size: 0.78rem;
	}

	.sheet {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(16rem, 0.75fr);
		align-items: start;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.editor {
		display: grid;
		align-content: start;
		gap: 0.75rem;
		min-width: 0;
		padding: 1.35rem 1.3rem 1.4rem;
	}

	.catalog {
		display: grid;
		align-content: start;
		gap: 1rem;
		max-height: 32rem;
		overflow: auto;
		padding-right: 0.2rem;
	}

	.catalog h3 {
		position: sticky;
		top: 0;
		z-index: 1;
		margin: 0;
		padding: 0.35rem 0;
		background: var(--surface);
		color: var(--wine-dark);
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.fees {
		display: grid;
		gap: 0.45rem;
	}

	.fees label {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.15rem 0.75rem;
		padding: 0.7rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 0.95rem;
		background: #fff;
		cursor: pointer;
	}

	.fees label.on {
		border-color: var(--wine);
		background: var(--wine-soft);
	}

	.fees label:has(input:focus-visible) {
		outline: 3px solid var(--wine-soft);
		outline-offset: 2px;
	}

	.fees input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.code {
		grid-column: 1;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.price {
		grid-column: 3;
		grid-row: 1 / span 2;
		align-self: center;
		font-weight: 700;
		white-space: nowrap;
	}

	.concept {
		grid-column: 1 / 3;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.slip {
		display: grid;
		align-content: end;
		gap: 0.35rem;
		position: sticky;
		top: 0;
		min-height: 22rem;
		padding: 1.4rem 1.3rem;
		background:
			radial-gradient(420px 180px at 100% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.slip .kicker,
	.formula,
	.hint {
		color: var(--sidebar-muted);
	}

	.total {
		margin: 0.2rem 0 0;
		font-family: var(--display);
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 1;
	}

	.formula,
	.chosen {
		margin: 0;
	}

	.chosen {
		margin-bottom: 0.85rem;
		font-size: 0.92rem;
	}

	dl {
		display: grid;
		gap: 0.65rem;
		margin: 0;
	}

	.slip dl {
		padding-top: 0.85rem;
		border-top: 1px solid rgb(255 255 255 / 0.14);
	}

	.slip dl div,
	.issued dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.issued dl div {
		flex-direction: column;
		gap: 0.15rem;
	}

	dt {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.slip dt {
		color: var(--sidebar-muted);
		font-size: inherit;
		font-weight: 400;
		letter-spacing: 0;
		text-transform: none;
	}

	dd {
		margin: 0;
		font-weight: 650;
		text-align: right;
	}

	.issued dd {
		text-align: left;
	}

	.hint {
		margin-top: 0.85rem;
		font-size: 0.82rem;
	}

	@media (max-width: 800px) {
		.sheet,
		.issued {
			grid-template-columns: 1fr;
		}

		.slip {
			position: static;
			min-height: 0;
		}
	}
</style>
