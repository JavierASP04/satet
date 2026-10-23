<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';
	import { formatCalendarDate, formatRate, formatRegisteredAt } from '#lib/bcv.js';

	const samples = [
		{
			uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			euros: '10,00 EUR',
			ved: '9.889,72 VED',
			status: 'Activo',
			issued: '15 oct. 2026'
		},
		{
			uuid: 'a12c90b1-4e21-4c55-9d10-11aa22bb33cc',
			euros: '5,00 EUR',
			ved: '4.944,86 VED',
			status: 'Consumido',
			issued: '2 oct. 2026'
		}
	];

	let { data } = $props();
</script>

<Screen
	module="04"
	title="Mis timbres fiscales"
	description="Tasa oficial con la que el euro del timbre pasa a bolívares."
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
					<Button href="/timbres/comprar">Estimar un monto</Button>
				</div>
			</section>
			<StaticNotice>
				El listado de timbres es estático. La tasa de arriba sí es la vigente. El PDF no se descarga.
			</StaticNotice>
			<DataTable>
				<thead>
					<tr>
						<th>Serial</th>
						<th>Euros</th>
						<th>Bolívares</th>
						<th>Emitido</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each samples as stamp (stamp.uuid)}
						<tr>
							<td class="serial">{stamp.uuid}</td>
							<td>{stamp.euros}</td>
							<td>{stamp.ved}</td>
							<td>{stamp.issued}</td>
							<td><span class="pill" class:used={stamp.status === 'Consumido'}>{stamp.status}</span></td>
							<td><button type="button">PDF</button></td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else}
			<section class="empty">
				<p class="kicker">Tasa vigente</p>
				<h2>Sin tasa vigente</h2>
				<p>Todavía no hay una tasa EUR/VED registrada para hoy ni para un día anterior.</p>
			</section>
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
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
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

	.serial {
		font-size: 0.82rem;
		overflow-wrap: anywhere;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		background: var(--ok-soft);
		color: var(--ok);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pill.used {
		background: var(--wine-soft);
		color: var(--wine-dark);
	}

	button {
		border: 0;
		background: transparent;
		color: var(--wine-dark);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
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
