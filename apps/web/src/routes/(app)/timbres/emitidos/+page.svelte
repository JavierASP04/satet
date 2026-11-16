<script>
	import Alert from '#lib/components/Alert.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { formatEur, formatRegisteredAt, formatVed } from '#lib/bcv.js';
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
	title="Timbres emitidos"
	description="Todos los timbres fiscales emitidos, con el estado de cada uno."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if data.stamps.length === 0}
			<section class="empty">
				<p class="kicker">Historial</p>
				<h2>Sin timbres emitidos</h2>
				<p>Cuando un contribuyente compre un timbre, aparecerá en esta lista.</p>
			</section>
		{:else}
			<p class="note">
				{data.stamps.length === 1 ? '1 timbre emitido' : `${data.stamps.length} timbres emitidos`}
			</p>
			<DataTable>
				<thead>
					<tr>
						<th>Contribuyente</th>
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
								<p class="who">{stamp.taxpayer || '—'}</p>
								<p class="meta">{stamp.rif || stamp.uuid}</p>
							</td>
							<td>
								<p class="who">{stamp.concept || stamp.feeCode || '—'}</p>
								<p class="meta">{stamp.feeCode}</p>
							</td>
							<td>{formatEur(stamp.amountEur)}</td>
							<td>{formatVed(Number(stamp.amountVed))}</td>
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

	.note,
	.empty p,
	.who,
	.meta,
	.kicker,
	.empty h2 {
		margin: 0;
	}

	.note,
	.meta,
	.empty p {
		color: var(--muted);
	}

	.meta {
		font-size: 0.82rem;
	}

	.empty {
		display: grid;
		gap: 0.35rem;
		padding: 1.4rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
	}

	.kicker {
		color: var(--wine-dark);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.empty h2 {
		font-size: 1.45rem;
	}

	.who {
		font-weight: 650;
	}

	.pill {
		display: inline-flex;
		padding: 0.28rem 0.65rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pill.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.pill.used {
		background: var(--warning-soft);
		color: var(--warning);
	}

	a {
		color: var(--wine-dark);
		font-weight: 700;
	}
</style>
