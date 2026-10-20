<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatCalendarDate, formatEur, formatRate, formatVed, vedFromEuros } from '#lib/bcv.js';

	let { data } = $props();
	let euros = $state('10');
	let asked = $state(false);

	const amounts = [1, 5, 10, 20, 50];
	const total = $derived(data.rate ? vedFromEuros(euros, data.rate.rateInVed) : null);
	const chosen = $derived(Number(euros));
</script>

<Screen
	module="04"
	title="Comprar timbre fiscal"
	description="Elige un valor en euros y mira el monto en bolívares con la tasa del día."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if !data.rate}
			<section class="empty">
				<p class="kicker">Tasa vigente</p>
				<h2>Sin tasa vigente</h2>
				<p>Todavía no hay una tasa EUR/VED para convertir el monto del timbre.</p>
			</section>
		{:else}
			<section class="sheet">
				<div class="editor">
					<p class="kicker">Monto del timbre</p>
					<div class="amounts" role="group" aria-label="Valores en euros">
						{#each amounts as amount (amount)}
							<button
								type="button"
								class:selected={chosen === amount}
								onclick={() => (euros = String(amount))}
							>
								{amount} EUR
							</button>
						{/each}
					</div>
					<TextField
						label="Otro valor en euros"
						name="euros"
						type="number"
						min="0.01"
						step="0.01"
						value={euros}
						oninput={(event) => (euros = event.currentTarget.value)}
					/>
					<div class="actions">
						<Button type="button" onclick={() => (asked = true)}>Solicitar timbre</Button>
						<Button href="/timbres" variant="ghost">Ver la tasa</Button>
					</div>
					<StaticNotice>
						La tasa es la vigente. Solicitar el timbre es estático: no se emite ni se descarga el PDF.
					</StaticNotice>
					{#if asked}
						<p class="preview">Muestra guardada en esta pantalla. No salió ninguna solicitud.</p>
					{/if}
				</div>
				<aside class="slip" aria-live="polite">
					<p class="kicker">En bolívares</p>
					<p class="total">{total != null ? formatVed(total) : '—'}</p>
					<p class="formula">
						{#if total != null}
							{formatEur(euros)} × {formatRate(data.rate.rateInVed)}
						{:else}
							Indica un valor mayor que cero.
						{/if}
					</p>
					<dl>
						<div>
							<dt>Tasa</dt>
							<dd>{formatRate(data.rate.rateInVed)}</dd>
						</div>
						<div>
							<dt>Vigencia</dt>
							<dd>{formatCalendarDate(data.rate.effectiveDate)}</dd>
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
		grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.editor {
		display: grid;
		align-content: start;
		gap: 0.95rem;
		padding: 1.35rem 1.3rem 1.4rem;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.editor .kicker {
		color: var(--muted);
	}

	.amounts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.amounts button {
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 650;
		cursor: pointer;
	}

	.amounts button.selected {
		border-color: var(--wine);
		background: var(--wine);
		color: #fff;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.preview {
		margin: 0;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.amounts button:focus-visible {
		outline: 3px solid var(--wine-soft);
		outline-offset: 2px;
	}

	.slip {
		display: grid;
		align-content: end;
		gap: 0.35rem;
		min-height: 18rem;
		padding: 1.4rem 1.3rem;
		background:
			radial-gradient(420px 180px at 100% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.slip .kicker,
	.formula {
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

	.formula {
		margin: 0 0 0.85rem;
		font-size: 0.92rem;
	}

	dl {
		display: grid;
		gap: 0.65rem;
		margin: 0;
		padding-top: 0.85rem;
		border-top: 1px solid rgb(255 255 255 / 0.14);
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	dt {
		color: var(--sidebar-muted);
	}

	dd {
		margin: 0;
		font-weight: 650;
		text-align: right;
	}

	.empty {
		max-width: 34rem;
		padding: 1.4rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.empty .kicker {
		color: var(--muted);
	}

	.empty h2 {
		margin: 0.7rem 0 0.4rem;
		font-size: 1.55rem;
	}

	.empty p:last-child {
		margin: 0;
		color: var(--muted);
	}

	@media (max-width: 800px) {
		.sheet {
			grid-template-columns: 1fr;
		}

		.slip {
			min-height: 0;
		}
	}
</style>
