<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import { AUDIT_ACTIONS, AUDIT_SUBJECTS, auditCard, auditFacts, auditPlace } from '#lib/audit.js';
	import { formatRegisteredAt } from '#lib/bcv.js';

	let { data } = $props();

	const limits = [
		{ value: '100', label: '100 más recientes' },
		{ value: '250', label: '250 más recientes' },
		{ value: '500', label: '500 más recientes' }
	];

	const countLabel = $derived.by(() => {
		if (data.logs.length === data.total) {
			return data.total === 1 ? '1 movimiento' : `${data.total} movimientos`;
		}
		return `${data.logs.length} de ${data.total}`;
	});

	const summary = $derived.by(() => {
		const logs = data.logs ?? [];
		const count = (action) => logs.filter((row) => row.action === action).length;
		return {
			approve: count('APPROVE'),
			reject: count('REJECT'),
			create: count('CREATE'),
			consume: count('CONSUME')
		};
	});
</script>

<Screen
	module="07"
	title="Auditoría"
	description="Qué hizo cada persona, del movimiento más reciente al más antiguo. Mirar esta lista no cambia ningún dato."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}

		{#if !data.error}
			<section class="summary" aria-label="Resumen de la bitácora">
				<article>
					<p class="kicker">Movimientos</p>
					<p class="figure">{data.total}</p>
					<p class="caption">{data.logs.length === data.total ? 'en esta consulta' : 'en total, con el filtro'}</p>
				</article>
				<article>
					<p class="kicker">Aprobaciones</p>
					<p class="figure ok">{summary.approve}</p>
					<p class="caption">en la lista</p>
				</article>
				<article>
					<p class="kicker">Rechazos</p>
					<p class="figure bad">{summary.reject}</p>
					<p class="caption">en la lista</p>
				</article>
				<article>
					<p class="kicker">Registros</p>
					<p class="figure">{summary.create}</p>
					<p class="caption">en la lista</p>
				</article>
				<article>
					<p class="kicker">Consumos</p>
					<p class="figure">{summary.consume}</p>
					<p class="caption">en la lista</p>
				</article>
			</section>
		{/if}

		<section class="bar">
			<form class="filter" method="GET">
				<SelectField label="Qué pasó" name="action" options={AUDIT_ACTIONS} value={data.action} />
				<SelectField label="Sobre qué" name="table" options={AUDIT_SUBJECTS} value={data.table} />
				<SelectField label="Mostrar" name="limit" options={limits} value={String(data.limit || 100)} />
				<Button>Filtrar</Button>
			</form>
			{#if !data.error}
				<p class="count">{countLabel}</p>
			{/if}
		</section>

		{#if !data.error && data.logs.length === 0}
			<section class="empty">
				<p class="kicker">Bitácora</p>
				<h2>No hay movimientos</h2>
				<p>
					{data.action || data.table
						? 'Ningún movimiento coincide con ese filtro.'
						: 'Cuando alguien registre, apruebe o rechace algo, aparecerá aquí.'}
				</p>
			</section>
		{:else if data.logs.length > 0}
			<ul class="cards">
				{#each data.logs as row (row.id)}
					{@const card = auditCard(row)}
					{@const facts = auditFacts(row.oldValues, row.newValues)}
					<li class="card {card.tone}">
						<div class="top">
							<div>
								<p class="subject">{card.subject}</p>
								<p class="who">{card.who}</p>
							</div>
							<span class="pill {card.tone}">{card.verb}</span>
						</div>
						<p class="when">
							{formatRegisteredAt(row.createdAt)}
							{#if auditPlace(row.ipAddress)}
								<span>· {auditPlace(row.ipAddress)}</span>
							{/if}
						</p>
						{#if facts.length > 0}
							<ul class="facts">
								{#each facts as fact, index (`${row.id}-${index}`)}
									<li>{fact}</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.summary {
		display: grid;
		grid-template-columns: 1.25fr repeat(4, 1fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.summary article {
		display: grid;
		align-content: end;
		gap: 0.2rem;
		min-height: 8.2rem;
		padding: 1.1rem 1.15rem;
		border-left: 1px solid var(--line);
	}

	.summary article:first-child {
		border-left: 0;
		background:
			radial-gradient(280px 120px at 0% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.summary article:first-child .kicker,
	.summary article:first-child .caption {
		color: var(--sidebar-muted);
	}

	.figure {
		margin: 0.15rem 0 0;
		font-family: var(--display);
		font-size: clamp(1.8rem, 3vw, 2.5rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.figure.ok {
		color: var(--ok);
	}

	.figure.bad {
		color: var(--danger);
	}

	.caption {
		margin: 0;
		color: var(--muted);
		font-size: 0.86rem;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 0.85rem;
		padding: 1rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.04);
	}

	.filter {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(10rem, 14rem) auto;
		gap: 0.75rem;
		align-items: end;
		flex: 1;
	}

	.count {
		margin: 0;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.empty {
		padding: 1.6rem 1.4rem;
		border-radius: 1.4rem;
		background: var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.empty .kicker {
		color: var(--sidebar-muted);
	}

	.empty h2 {
		margin: 0.35rem 0 0.4rem;
	}

	.empty p:last-child {
		margin: 0;
		max-width: 36rem;
		color: var(--sidebar-text);
	}

	.cards {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: grid;
		gap: 0.8rem;
		padding: 1.15rem 1.2rem 1.15rem 1.35rem;
		border: 1px solid var(--line);
		border-left: 4px solid var(--wine);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.05);
	}

	.card.ok {
		border-left-color: var(--ok);
	}

	.card.bad {
		border-left-color: var(--danger);
	}

	.card.wait {
		border-left-color: var(--warning);
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.subject,
	.who,
	.when {
		margin: 0;
	}

	.subject {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--wine-dark);
	}

	.who {
		margin-top: 0.15rem;
		font-family: var(--display);
		font-size: 1.28rem;
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.when {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.pill {
		display: inline-flex;
		padding: 0.32rem 0.75rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.pill.wait {
		background: var(--warning-soft);
		color: var(--warning);
	}

	.facts {
		display: grid;
		gap: 0.4rem;
		margin: 0;
		padding: 0.85rem 1rem;
		list-style: none;
		border-radius: 1rem;
		background: var(--canvas);
	}

	.facts li {
		padding-left: 0.95rem;
		line-height: 1.4;
	}

	.facts li::before {
		content: '';
		display: inline-block;
		width: 0.42rem;
		height: 0.42rem;
		margin-right: 0.55rem;
		margin-left: -0.95rem;
		border-radius: 999px;
		background: var(--wine);
		vertical-align: 0.05rem;
	}

	.card.ok .facts li::before {
		background: var(--ok);
	}

	.card.bad .facts li::before {
		background: var(--danger);
	}

	.card.wait .facts li::before {
		background: var(--warning);
	}

	@media (max-width: 980px) {
		.summary,
		.filter {
			grid-template-columns: 1fr;
		}

		.summary article {
			border-top: 1px solid var(--line);
			border-left: 0;
		}

		.summary article:first-child {
			border-top: 0;
		}
	}
</style>
