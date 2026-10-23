<script>
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';

	let exportNote = $state('');

	const branches = [
		{ name: 'Minería', collected: '1.250.000,00', goal: '2.000.000,00', share: '63%' },
		{ name: '1 x 1000', collected: '860.000,00', goal: '1.200.000,00', share: '72%' },
		{ name: 'Timbres', collected: '410.500,00', goal: '600.000,00', share: '68%' }
	];
</script>

<Screen
	module="07"
	title="Dashboard POA"
	description="Recaudación mensual frente a la meta, desglose por ramo y exportaciones."
	ready
>
	<div class="stack">
		<StaticNotice />
		<section class="board">
			<div class="figure">
				<p class="kicker">Octubre 2026</p>
				<p class="amount">2.520.500,00</p>
				<p class="unit">VED recaudados · muestra</p>
			</div>
			<div class="meta">
				<dl>
					<div>
						<dt>Meta del mes</dt>
						<dd>3.800.000,00 VED</dd>
					</div>
					<div>
						<dt>Cumplimiento</dt>
						<dd>66%</dd>
					</div>
					<div>
						<dt>Acumulado del año</dt>
						<dd>18.440.000,00 VED</dd>
					</div>
				</dl>
				<div class="actions">
					<Button
						type="button"
						onclick={() => (exportNote = 'La exportación a Excel es estática. No se descargó ningún archivo.')}
					>
						Exportar Excel
					</Button>
					<Button
						type="button"
						variant="ghost"
						onclick={() => (exportNote = 'El informe PDF es estático. No se descargó ningún archivo.')}
					>
						Exportar PDF
					</Button>
				</div>
				{#if exportNote}
					<p class="note">{exportNote}</p>
				{/if}
			</div>
		</section>
		<section class="branches">
			{#each branches as branch (branch.name)}
				<article>
					<p>{branch.name}</p>
					<strong>{branch.collected}</strong>
					<span>Meta {branch.goal} · {branch.share}</span>
				</article>
			{/each}
		</section>
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.board {
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
		min-height: 15rem;
		padding: 1.45rem;
		background:
			radial-gradient(420px 180px at 0% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	.unit {
		margin: 0;
		color: var(--sidebar-muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.amount {
		margin: 0.3rem 0 0;
		font-family: var(--display);
		font-size: clamp(2.2rem, 4vw, 3.4rem);
		font-weight: 650;
		letter-spacing: -0.05em;
		line-height: 0.95;
	}

	.meta {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.35rem;
	}

	dl {
		display: grid;
		gap: 0.85rem;
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
		margin: 0.12rem 0 0;
		font-weight: 650;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.note {
		margin: 0;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.branches {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.branches article {
		padding: 1.05rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 1.2rem;
		background: var(--surface);
	}

	.branches p,
	.branches span {
		margin: 0;
		color: var(--muted);
	}

	.branches p {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.branches strong {
		display: block;
		margin: 0.4rem 0 0.25rem;
		font-family: var(--display);
		font-size: 1.45rem;
		font-weight: 650;
		letter-spacing: -0.04em;
	}

	.branches span {
		font-size: 0.88rem;
	}

	@media (max-width: 860px) {
		.board,
		.branches {
			grid-template-columns: 1fr;
		}
	}
</style>
