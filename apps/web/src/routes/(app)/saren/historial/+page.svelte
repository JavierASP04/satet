<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatEur, formatRate, formatRegisteredAt, formatVed } from '#lib/bcv.js';
	import { stampStatusLabel } from '#lib/stamps.js';

	let { data } = $props();

	const limits = [
		{ value: '100', label: '100' },
		{ value: '250', label: '250' },
		{ value: '500', label: '500' }
	];
</script>

<Screen
	module="06"
	title="Historial de verificaciones"
	description="Timbres consumidos, del más reciente al más antiguo. El filtro usa el nombre exacto de la oficina."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}

		<section class="bar">
			<form class="filter" method="GET">
				<TextField
					label="Oficina"
					name="officeName"
					maxlength="255"
					placeholder="Todas las oficinas"
					value={data.officeName}
				/>
				<SelectField label="Cantidad" name="limit" options={limits} value={String(data.limit || 100)} />
				<Button>Filtrar</Button>
			</form>
			{#if !data.error}
				<p class="count">
					{data.verifications.length === 1
						? '1 timbre consumido'
						: `${data.verifications.length} timbres consumidos`}
				</p>
			{/if}
		</section>

		{#if !data.error && data.verifications.length === 0}
			<section class="empty">
				<p class="kicker">Historial</p>
				<h2>Sin timbres consumidos</h2>
				<p>
					{data.officeName
						? `No hay consumos con la oficina «${data.officeName}».`
						: 'Cuando un verificador consuma un timbre, aparecerá aquí.'}
				</p>
				<Button href="/saren/verificar" variant="light">Verificar timbre</Button>
			</section>
		{:else if data.verifications.length > 0}
			<ul class="cards">
				{#each data.verifications as row (row.uuid)}
					<li class="card">
						<div class="top">
							<div>
								<p class="who">{row.taxpayer || 'Contribuyente no disponible'}</p>
								<p class="rif">{row.rif || row.uuid}</p>
							</div>
							<span class="pill">{stampStatusLabel(row.status)}</span>
						</div>
						<p class="serial">{row.uuid}</p>
						<dl>
							<div>
								<dt>Consumido</dt>
								<dd>{formatRegisteredAt(row.consumedAt)}</dd>
							</div>
							<div>
								<dt>Emitido</dt>
								<dd>{formatRegisteredAt(row.issuedAt)}</dd>
							</div>
							<div>
								<dt>Oficina</dt>
								<dd>{row.officeName || '—'}</dd>
							</div>
							<div>
								<dt>Verificador</dt>
								<dd>{row.consumedByEmail || '—'}</dd>
							</div>
							<div>
								<dt>Monto</dt>
								<dd>
									{formatEur(row.amountEur)}
									<span>{formatVed(Number(row.amountVed))}</span>
								</dd>
							</div>
							<div>
								<dt>Tasa</dt>
								<dd>{row.bcvRate ? formatRate(row.bcvRate) : '—'}</dd>
							</div>
						</dl>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 1rem;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.filter {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
		flex: 1 1 22rem;
	}

	.filter :global(.field) {
		flex: 1 1 16rem;
	}

	.count {
		margin: 0;
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		background: var(--ok-soft);
		color: var(--ok);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.cards {
		display: grid;
		gap: 0.85rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: grid;
		gap: 0.75rem;
		padding: 1.15rem 1.2rem;
		border: 1px solid var(--line);
		border-left: 4px solid var(--ok);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.who,
	.rif,
	.serial {
		margin: 0;
	}

	.who {
		font-family: var(--display);
		font-size: 1.3rem;
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.rif,
	.serial {
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	.serial {
		font-size: 0.88rem;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem 1rem;
		margin: 0;
	}

	dt {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	dd {
		margin: 0.15rem 0 0;
		font-weight: 650;
		overflow-wrap: anywhere;
	}

	dd span {
		display: block;
		margin-top: 0.1rem;
		color: var(--muted);
		font-weight: 500;
	}

	.pill {
		display: inline-flex;
		padding: 0.32rem 0.75rem;
		border-radius: 999px;
		background: var(--ok-soft);
		color: var(--ok);
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.empty {
		display: grid;
		justify-items: start;
		gap: 0.35rem;
		padding: 1.4rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		color: var(--sidebar-muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.empty h2 {
		margin: 0.2rem 0;
		font-size: 1.6rem;
	}

	.empty p {
		margin: 0 0 0.55rem;
		max-width: 36rem;
		color: var(--sidebar-muted);
	}

	@media (max-width: 980px) {
		dl {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
