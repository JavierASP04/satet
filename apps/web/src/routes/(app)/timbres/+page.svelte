<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { formatCalendarDate, formatEur, formatRate, formatRegisteredAt, formatVed } from '#lib/bcv.js';
	import { stampStatusLabel } from '#lib/stamps.js';

	let { data } = $props();

	/** @param {string} status */
	function tone(status) {
		if (status === 'ACTIVO') return 'ok';
		if (status === 'ANULADO') return 'bad';
		return 'used';
	}
</script>

<Screen
	module="04"
	title="Mis timbres fiscales"
	description="Tasa vigente y los timbres emitidos en esta sesión."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if data.rate}
			<section class="hero">
				<div class="figure">
					<p class="kicker">Tasa vigente</p>
					<p class="amount">{formatRate(data.rate.rateInVed)}</p>
					<p class="unit">VED por 1 EUR</p>
				</div>
				<div class="meta">
					<dl>
						<div>
							<dt>Vigencia</dt>
							<dd>{formatCalendarDate(data.rate.effectiveDate)}</dd>
						</div>
						<div>
							<dt>Registrada</dt>
							<dd>{formatRegisteredAt(data.rate.createdAt)}</dd>
						</div>
						<div>
							<dt>Conversión</dt>
							<dd>1 EUR = {formatRate(data.rate.rateInVed)} VED</dd>
						</div>
					</dl>
					<Button href="/timbres/comprar">Comprar timbre</Button>
				</div>
			</section>
		{:else}
			<section class="empty">
				<p class="kicker">Tasa vigente</p>
				<h2>Sin tasa vigente</h2>
				<p>Todavía no hay una tasa EUR/VED registrada para hoy ni para un día anterior.</p>
				<Button href="/timbres/comprar">Ver el tabulador</Button>
			</section>
		{/if}

		{#if data.stamps.length === 0}
			<section class="empty">
				<p class="kicker">Esta sesión</p>
				<h2>Sin timbres emitidos</h2>
				<p>
					Los timbres que emitas quedan aquí, con su PDF, hasta que cierres la sesión. El servicio no
					entrega el historial de la cuenta.
				</p>
			</section>
		{:else}
			<p class="note">
				{data.stamps.length === 1 ? '1 timbre emitido' : `${data.stamps.length} timbres emitidos`} en
				esta sesión. Al salir se borran de esta lista.
			</p>
			<DataTable>
				<thead>
					<tr>
						<th>Concepto</th>
						<th>Euros</th>
						<th>Bolívares</th>
						<th>Emitido</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.stamps as stamp (stamp.uuid)}
						<tr>
							<td>
								<p class="concept">{stamp.concept || stamp.feeCode}</p>
								<p class="serial">{stamp.feeCode} · {stamp.uuid}</p>
								{#if stamp.taxpayer || stamp.rif}
									<p class="serial">{stamp.taxpayer}{stamp.rif ? ` · ${stamp.rif}` : ''}</p>
								{/if}
							</td>
							<td>{formatEur(stamp.amountEur)}</td>
							<td>
								{formatVed(Number(stamp.amountVed))}
								{#if stamp.bcvRate}
									<p class="serial">Tasa {formatRate(stamp.bcvRate)}</p>
								{/if}
							</td>
							<td>{formatRegisteredAt(stamp.issuedAt)}</td>
							<td>
								<span class="pill {tone(stamp.status)}">{stampStatusLabel(stamp.status)}</span>
							</td>
							<td><a href="/timbres/{stamp.uuid}/pdf">PDF</a></td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(16rem, 1.15fr) minmax(16rem, 0.9fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.figure {
		display: grid;
		align-content: end;
		gap: 0.35rem;
		min-height: 16.5rem;
		padding: 1.5rem 1.45rem;
		background:
			radial-gradient(420px 180px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.figure .kicker,
	.unit {
		color: var(--sidebar-muted);
	}

	.amount {
		margin: 0.35rem 0 0;
		font-family: var(--display);
		font-size: clamp(2.8rem, 5vw, 4.2rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.unit {
		margin: 0;
	}

	.meta {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 1.4rem 1.35rem;
	}

	dl {
		display: grid;
		gap: 0.95rem;
		margin: 0;
	}

	dt {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.15rem 0 0;
		font-size: 1.05rem;
		font-weight: 650;
	}

	.empty {
		display: grid;
		justify-items: start;
		gap: 0.35rem;
		max-width: 40rem;
		padding: 1.4rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.empty .kicker {
		color: var(--muted);
	}

	.empty h2 {
		margin: 0.35rem 0 0.15rem;
		font-size: 1.55rem;
	}

	.empty p {
		margin: 0 0 0.55rem;
		color: var(--muted);
	}

	.note {
		margin: 0;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.concept {
		margin: 0;
		font-weight: 650;
	}

	.serial {
		margin: 0.2rem 0 0;
		color: var(--muted);
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pill.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.used {
		background: var(--wine-soft);
		color: var(--wine-dark);
	}

	.pill.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	@media (max-width: 800px) {
		.hero {
			grid-template-columns: 1fr;
		}

		.figure {
			min-height: 12rem;
		}
	}
</style>
