<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { formatVedText } from '#lib/payments.js';

	let { data } = $props();

	/** @type {HTMLIFrameElement | null} */
	let informe = $state(null);
	let previewOpen = $state(false);

	function openPreview() {
		previewOpen = true;
	}

	function closePreview() {
		previewOpen = false;
	}

	function printInforme() {
		informe?.blur();
		window.print();
	}

	const summary = $derived(data.summary);

	/** @param {string} value */
	function monthLabel(value) {
		const [year, month] = String(value).split('-').map(Number);
		if (!year || !month) return value;
		const label = new Intl.DateTimeFormat('es-VE', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(year, month - 1, 1)));
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	/** @param {string | number | null | undefined} value */
	function cents(value) {
		const text = String(value ?? '0').trim();
		const negative = text.startsWith('-');
		const [whole, frac = ''] = text.replace('-', '').split('.');
		const amount = Number(whole || 0) * 100 + Number((frac + '00').slice(0, 2));
		return (negative ? -1 : 1) * amount;
	}

	const BRANCH_COLORS = {
		MINERO: '#1f6b45',
		UN_POR_MIL: '#c47b45',
		TIMBRE_FISCAL: '#1a6b7a'
	};

	/** @param {string} taxType */
	function branchColor(taxType) {
		return BRANCH_COLORS[taxType] ?? '#5c6b62';
	}

	/** @param {string} value */
	function monthTick(value) {
		const [year, month] = String(value).split('-').map(Number);
		if (!year || !month) return value;
		const label = new Intl.DateTimeFormat('es-VE', { month: 'short', timeZone: 'UTC' }).format(
			new Date(Date.UTC(year, month - 1, 1))
		);
		return `${label.replace('.', '')} ${year}`;
	}

	const ring = $derived.by(() => {
		const branches = summary?.byBranch ?? [];
		const total = cents(summary?.totalVed);
		const radius = 70;
		const circumference = 2 * Math.PI * radius;
		const positive = branches.filter((branch) => cents(branch.totalVed) > 0).length;
		const gap = positive > 1 ? 5 : 0;
		/** @type {{ color: string, dash: string, rotate: number, label: string, amount: string }[]} */
		const slices = [];
		let used = 0;
		for (const branch of branches) {
			const value = cents(branch.totalVed);
			if (value <= 0 || total <= 0) continue;
			const span = (value / total) * circumference;
			slices.push({
				color: branchColor(branch.taxType),
				dash: `${Math.max(span - gap, 1)} ${circumference}`,
				rotate: (used / circumference) * 360 - 90,
				label: branch.label,
				amount: branch.totalVed
			});
			used += span;
		}
		return { radius, slices };
	});

	const columns = $derived.by(() => {
		const months = summary?.months ?? [];
		const width = Math.max(560, months.length * 72);
		const height = 280;
		const padL = 8;
		const padR = 8;
		const padT = 12;
		const padB = 42;
		const innerW = width - padL - padR;
		const innerH = height - padT - padB;
		const gap = months.length > 6 ? 10 : 22;
		const maxBar = months.length === 1 ? 132 : months.length <= 3 ? 92 : 56;
		const barW = Math.min(maxBar, (innerW - gap * Math.max(months.length - 1, 0)) / Math.max(months.length, 1));
		const occupied = barW * months.length + gap * Math.max(months.length - 1, 0);
		const startX = padL + (innerW - occupied) / 2;
		const peak = Math.max(1, ...months.map((month) => cents(month.totalVed)));
		return {
			width,
			height,
			baseline: padT + innerH,
			items: months.map((month, index) => {
				let cursor = padT + innerH;
				const segments = month.byBranch.flatMap((branch) => {
					const value = cents(branch.totalVed);
					const segmentHeight = (value / peak) * innerH;
					if (segmentHeight <= 0) return [];
					cursor -= segmentHeight;
					return [
						{
							y: cursor,
							height: segmentHeight,
							color: branchColor(branch.taxType),
							label: `${branch.label}: ${formatVedText(branch.totalVed)}`
						}
					];
				});
				return {
					key: month.month,
					x: startX + index * (barW + gap),
					width: barW,
					tick: monthTick(month.month),
					total: formatVedText(month.totalVed),
					segments
				};
			})
		};
	});

	/** @param {string | number | null | undefined} value */
	function portionWidth(value) {
		const total = cents(summary?.totalVed);
		if (total <= 0) return 0;
		return (cents(value) / total) * 100;
	}

	/** @param {string | number | null | undefined} value */
	function portion(value) {
		return `${portionWidth(value).toFixed(1).replace('.', ',')} %`;
	}

	const ranks = $derived.by(() => {
		const branches = summary?.byBranch ?? [];
		const peak = Math.max(1, ...branches.map((branch) => cents(branch.totalVed)));
		return branches.map((branch) => ({
			...branch,
			width: (cents(branch.totalVed) / peak) * 100
		}));
	});

	const trend = $derived.by(() => {
		const months = summary?.months ?? [];
		const width = Math.max(520, months.length * 88);
		const height = 240;
		const padL = 18;
		const padR = 18;
		const padT = 28;
		const padB = 36;
		const innerW = width - padL - padR;
		const innerH = height - padT - padB;
		const peak = Math.max(1, ...months.map((month) => cents(month.totalVed)));
		const points = months.map((month, index) => {
			const x = months.length === 1 ? padL + innerW / 2 : padL + (index / (months.length - 1)) * innerW;
			const y = padT + innerH - (cents(month.totalVed) / peak) * innerH;
			return { x, y, tick: monthTick(month.month), total: formatVedText(month.totalVed) };
		});
		const baseline = padT + innerH;
		const area =
			points.length > 1
				? `M ${points[0].x} ${baseline} ${points.map((point) => `L ${point.x} ${point.y}`).join(' ')} L ${points.at(-1).x} ${baseline} Z`
				: '';
		return { width, height, baseline, points, area, line: points.map((point) => `${point.x},${point.y}`).join(' ') };
	});

	const grouped = $derived.by(() => {
		const months = summary?.months ?? [];
		const branchCount = Math.max(summary?.byBranch?.length ?? 1, 1);
		const width = Math.max(520, months.length * 150);
		const height = 260;
		const padL = 12;
		const padR = 12;
		const padT = 16;
		const padB = 42;
		const innerW = width - padL - padR;
		const innerH = height - padT - padB;
		const groupGap = 28;
		const barGap = 8;
		const groupW = Math.min(
			210,
			(innerW - groupGap * Math.max(months.length - 1, 0)) / Math.max(months.length, 1)
		);
		const barW = (groupW - barGap * (branchCount - 1)) / branchCount;
		const occupied = groupW * months.length + groupGap * Math.max(months.length - 1, 0);
		const startX = padL + (innerW - occupied) / 2;
		let peak = 1;
		for (const month of months) {
			for (const branch of month.byBranch) peak = Math.max(peak, cents(branch.totalVed));
		}
		return {
			width,
			height,
			baseline: padT + innerH,
			items: months.map((month, index) => {
				const x = startX + index * (groupW + groupGap);
				return {
					key: month.month,
					tick: monthTick(month.month),
					tickX: x + groupW / 2,
					bars: month.byBranch.map((branch, barIndex) => {
						const heightOf = (cents(branch.totalVed) / peak) * innerH;
						return {
							x: x + barIndex * (barW + barGap),
							y: padT + innerH - heightOf,
							height: heightOf,
							width: barW,
							color: branchColor(branch.taxType),
							label: `${branch.label}: ${formatVedText(branch.totalVed)}`
						};
					})
				};
			})
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (previewOpen && event.key === 'Escape') closePreview();
	}}
/>

<Screen
	module="07"
	title="Dashboard POA"
	description="Recaudación de los pagos ya verificados, por ramo y por mes. El sistema no define una meta proyectada."
	ready
>
	<div class="stack">
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if summary}
			<section class="board">
				<div class="figure">
					<p class="kicker">Total verificado</p>
					<p class="amount">{formatVedText(summary.totalVed).replace(' VED', '')}</p>
					<p class="unit">{summary.currency || 'VED'} · solo pagos conciliados</p>
				</div>
				<div class="aside">
					<p>
						Entra al total un pago en estado verificado. El mes es el de Caracas al momento de
						conciliarlo. Pendiente y rechazado no suman, aunque una planilla esté aprobada.
					</p>
					<p>No hay meta ni porcentaje de cumplimiento: la especificación no trae esa cifra.</p>
					<div class="actions">
						<Button href="/reportes/excel">Exportar Excel</Button>
						<Button type="button" variant="ghost" onclick={openPreview}>Ver informe</Button>
					</div>
					<p class="note">El Excel lista todos los pagos, con su estado. El informe se abre para verlo e imprimirlo.</p>
				</div>
			</section>

			{#if previewOpen}
				<div class="backdrop">
					<button type="button" class="scrim" aria-label="Cerrar informe" onclick={closePreview}></button>
					<section class="preview" role="dialog" aria-modal="true" aria-label="Informe de gestión">
						<div class="preview-bar">
							<h2>Informe de gestión</h2>
							<div class="preview-actions">
								<button type="button" onclick={printInforme}>Imprimir</button>
								<button type="button" class="close" onclick={closePreview}>Cerrar</button>
							</div>
						</div>
						<iframe
							class="sheet"
							bind:this={informe}
							title="Informe de gestión"
							src="/reportes/pdf#toolbar=0&navpanes=0&view=FitH"
						></iframe>
				<article class="print-sheet">
					<header>
						<img src="/satet-sidebar.png" alt="SATET" />
						<img src="/gobernacion-blanco.png" alt="Gobierno Bolivariano de Trujillo" />
					</header>
					<h2>Informe de gestión</h2>
					<p>
						Recaudación de los pagos verificados, en bolívares. La especificación no define la meta
						proyectada. Este informe no la compara.
					</p>
					<h3>Por ramo</h3>
					<table>
						<thead>
							<tr>
								<th>Ramo</th>
								<th>Recaudado</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.byBranch as branch (branch.taxType)}
								<tr>
									<td>{branch.label}</td>
									<td>{formatVedText(branch.totalVed)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<h3>Por mes</h3>
					{#if summary.months.length === 0}
						<p>Sin pagos verificados.</p>
					{:else}
						<table>
							<thead>
								<tr>
									<th>Mes</th>
									{#each summary.byBranch as branch (branch.taxType)}
										<th>{branch.label}</th>
									{/each}
									<th>Total</th>
								</tr>
							</thead>
							<tbody>
								{#each summary.months as month (month.month)}
									<tr>
										<td>{monthLabel(month.month)}</td>
										{#each month.byBranch as branch (branch.taxType)}
											<td>{formatVedText(branch.totalVed)}</td>
										{/each}
										<td>{formatVedText(month.totalVed)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
					<p class="total">
						<span>Total acumulado</span>
						<strong>{formatVedText(summary.totalVed)}</strong>
					</p>
				</article>
					</section>
				</div>
			{/if}

			<section class="branches">
				{#each summary.byBranch as branch (branch.taxType)}
					<article style:--branch={branchColor(branch.taxType)}>
						<p>{branch.label}</p>
						<strong>{formatVedText(branch.totalVed)}</strong>
					</article>
				{/each}
			</section>

			<section class="charts">
				<article>
					<h2>Por ramo</h2>
					<div class="donut-wrap">
						<svg viewBox="0 0 220 220" role="img" aria-label="Reparto de la recaudación verificada por ramo">
							<circle cx="110" cy="110" r={ring.radius} fill="none" stroke="var(--wine-soft)" stroke-width="22" />
							{#each ring.slices as slice (slice.label)}
								<circle
									cx="110"
									cy="110"
									r={ring.radius}
									fill="none"
									stroke={slice.color}
									stroke-width="22"
									stroke-dasharray={slice.dash}
									transform="rotate({slice.rotate} 110 110)"
								>
									<title>{slice.label}: {formatVedText(slice.amount)}</title>
								</circle>
							{/each}
							<text class="hole" x="110" y="108" text-anchor="middle">
								{formatVedText(summary.totalVed).replace(' VED', '')}
							</text>
							<text class="hole-unit" x="110" y="128" text-anchor="middle">VED</text>
						</svg>
						<ul class="legend">
							{#each summary.byBranch as branch (branch.taxType)}
								<li>
									<i style:background={branchColor(branch.taxType)}></i>
									<span>{branch.label}</span>
									<strong>{formatVedText(branch.totalVed)}</strong>
								</li>
							{/each}
						</ul>
					</div>
				</article>

				<article>
					<h2>Por mes</h2>
					{#if summary.months.length === 0}
						<p class="empty">Todavía no hay un mes con pagos verificados.</p>
					{:else}
						<div class="plot">
							<svg
								class="columns"
								viewBox="0 0 {columns.width} {columns.height}"
								role="img"
								aria-label="Recaudación verificada por mes, separada por ramo"
							>
								<line
									x1="8"
									x2={columns.width - 8}
									y1={columns.baseline}
									y2={columns.baseline}
									stroke="var(--line)"
								/>
								{#each columns.items as column (column.key)}
									{#each column.segments as segment, index (`${column.key}-${index}`)}
										<rect
											x={column.x}
											y={segment.y}
											width={column.width}
											height={segment.height}
											fill={segment.color}
										>
											<title>{column.tick}. {segment.label}</title>
										</rect>
									{/each}
									<text class="tick" x={column.x + column.width / 2} y={columns.baseline + 22} text-anchor="middle">
										{column.tick}
									</text>
								{/each}
							</svg>
						</div>
						<p class="scale">Cada columna es un mes con pagos verificados. El color es el ramo.</p>
					{/if}
				</article>
			</section>

			<section class="charts extra">
				<article>
					<h2>Comparación</h2>
					<div class="hbars">
						{#each ranks as branch (branch.taxType)}
							<div>
								<div class="hbar-top">
									<span>{branch.label}</span>
									<strong>{formatVedText(branch.totalVed)}</strong>
								</div>
								<div class="track">
									<span style:width="{branch.width}%" style:background={branchColor(branch.taxType)}></span>
								</div>
							</div>
						{/each}
					</div>
					<p class="scale">Cada barra se mide contra el ramo que más recaudó.</p>
				</article>

				<article>
					<h2>Composición</h2>
					{#if cents(summary.totalVed) <= 0}
						<p class="empty">Todavía no hay recaudación verificada para repartir.</p>
					{:else}
						<div class="mix" role="img" aria-label="Porción de cada ramo en el total verificado">
							{#each summary.byBranch as branch (branch.taxType)}
								{#if cents(branch.totalVed) > 0}
									<span style:width="{portionWidth(branch.totalVed)}%" style:background={branchColor(branch.taxType)}>
										<title>{branch.label}: {portion(branch.totalVed)} del total verificado</title>
									</span>
								{/if}
							{/each}
						</div>
						<ul class="mix-legend">
							{#each summary.byBranch as branch (branch.taxType)}
								<li>
									<i style:background={branchColor(branch.taxType)}></i>
									<span>{branch.label}</span>
									<strong>{portion(branch.totalVed)}</strong>
								</li>
							{/each}
						</ul>
						<p class="scale">Porción de lo ya recaudado. No es un cumplimiento de meta.</p>
					{/if}
				</article>

				<article>
					<h2>Tendencia</h2>
					{#if summary.months.length === 0}
						<p class="empty">Todavía no hay un mes con pagos verificados.</p>
					{:else}
						<div class="plot">
							<svg
								class="columns"
								viewBox="0 0 {trend.width} {trend.height}"
								role="img"
								aria-label="Tendencia de la recaudación verificada por mes"
							>
								<line x1="12" x2={trend.width - 12} y1={trend.baseline} y2={trend.baseline} stroke="var(--line)" />
								{#if trend.area}
									<path d={trend.area} fill="#1f6b45" opacity="0.12" />
									<polyline points={trend.line} fill="none" stroke="#1f6b45" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
								{/if}
								{#each trend.points as point (point.tick)}
									{#if trend.points.length === 1}
										<line x1={point.x} x2={point.x} y1={trend.baseline} y2={point.y} stroke="#1f6b45" stroke-width="3" />
									{/if}
									<circle cx={point.x} cy={point.y} r="5" fill="#1f6b45" />
									<text class="tick" x={point.x} y={point.y - 12} text-anchor="middle">{point.total}</text>
									<text class="tick" x={point.x} y={trend.baseline + 22} text-anchor="middle">{point.tick}</text>
								{/each}
							</svg>
						</div>
						<p class="scale">Total verificado de cada mes. La línea aparece cuando hay más de un mes.</p>
					{/if}
				</article>

				<article>
					<h2>Ramos en el mes</h2>
					{#if summary.months.length === 0}
						<p class="empty">Todavía no hay un mes con pagos verificados.</p>
					{:else}
						<div class="plot">
							<svg
								class="columns"
								viewBox="0 0 {grouped.width} {grouped.height}"
								role="img"
								aria-label="Recaudación de cada ramo en cada mes"
							>
								<line x1="8" x2={grouped.width - 8} y1={grouped.baseline} y2={grouped.baseline} stroke="var(--line)" />
								{#each grouped.items as group (group.key)}
									{#each group.bars as bar, index (`${group.key}-${index}`)}
										{#if bar.height > 0}
											<rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.color} rx="5">
												<title>{group.tick}. {bar.label}</title>
											</rect>
										{/if}
									{/each}
									<text class="tick" x={group.tickX} y={grouped.baseline + 22} text-anchor="middle">{group.tick}</text>
								{/each}
							</svg>
						</div>
						<p class="scale">Las tres barras de un mes se comparan entre sí. La que está en cero no se dibuja.</p>
					{/if}
				</article>
			</section>

			{#if summary.months.length > 0}
				<section class="months">
					<h2>Detalle</h2>
					<ul>
						{#each summary.months as month (month.month)}
							<li>
								<div class="month-top">
									<strong>{monthLabel(month.month)}</strong>
									<span>{formatVedText(month.totalVed)}</span>
								</div>
								<dl>
									{#each month.byBranch as branch (branch.taxType)}
										<div>
											<dt>{branch.label}</dt>
											<dd>{formatVedText(branch.totalVed)}</dd>
										</div>
									{/each}
								</dl>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
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
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
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

	.aside {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.85rem;
		padding: 1.35rem;
	}

	.aside p,
	.note,
	.scale,
	.empty {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgb(15 46 34 / 0.55);
		cursor: pointer;
	}

	.preview {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		width: min(100%, 64rem);
		height: min(88vh, 52rem);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 24px 60px rgb(15 46 34 / 0.28);
	}

	.preview-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--line);
		background: var(--canvas);
	}

	.preview-bar h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.preview-actions {
		display: flex;
		gap: 0.45rem;
	}

	.preview-bar button {
		padding: 0.45rem 0.9rem;
		border: 0;
		border-radius: 999px;
		background: var(--wine);
		color: #fff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.preview-bar .close {
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
	}

	.sheet {
		display: block;
		flex: 1;
		width: 100%;
		min-height: 0;
		border: 0;
		background: #fff;
	}

	.print-sheet {
		display: none;
	}

	@media print {
		:global(html),
		:global(body) {
			background: #fff !important;
		}

		:global(aside),
		:global(.topbar),
		:global(.banner),
		:global(header.head) {
			display: none !important;
		}

		:global(.shell),
		:global(.workspace) {
			display: block !important;
			background: #fff !important;
		}

		.board,
		.branches,
		.charts,
		.months,
		.preview-bar,
		.sheet,
		.scrim {
			display: none !important;
		}

		.backdrop {
			position: static;
			display: block;
			padding: 0;
		}

		.preview {
			width: auto;
			height: auto;
			border: 0;
			border-radius: 0;
			box-shadow: none;
		}

		.print-sheet {
			display: block;
			color: #14211a;
		}

		.print-sheet header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 1.4rem;
			padding: 0.8rem 1rem;
			background: #0f2e22 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.print-sheet header img {
			width: auto;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.print-sheet header img:first-child {
			height: 3.2rem;
		}

		.print-sheet header img:last-child {
			height: 1.7rem;
		}

		.print-sheet h2,
		.print-sheet h3,
		.print-sheet p {
			margin: 0 0 0.7rem;
		}

		.print-sheet h2 {
			font-size: 1.4rem;
		}

		.print-sheet h3 {
			margin-top: 1.1rem;
			font-size: 0.78rem;
			letter-spacing: 0.06em;
			text-transform: uppercase;
		}

		.print-sheet table {
			width: 100%;
			border-collapse: collapse;
		}

		.print-sheet th,
		.print-sheet td {
			padding: 0.4rem 0.5rem;
			border-bottom: 1px solid #d5e6db;
			text-align: left;
		}

		.print-sheet th {
			background: #0f2e22 !important;
			color: #fff;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.print-sheet td:not(:first-child),
		.print-sheet th:not(:first-child) {
			text-align: right;
		}

		.print-sheet .total {
			display: flex;
			justify-content: space-between;
			margin-top: 1rem;
			padding: 0.7rem 0.8rem;
			background: #1f6b45 !important;
			color: #fff;
			font-weight: 700;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}

	.branches {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.branches article,
	.charts article,
	.months {
		padding: 1.05rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 1.2rem;
		background: var(--surface);
	}

	.branches article {
		border-top: 4px solid var(--branch);
	}

	.branches p {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.branches strong {
		display: block;
		margin: 0.4rem 0 0;
		font-family: var(--display);
		font-size: 1.45rem;
		font-weight: 650;
		letter-spacing: -0.04em;
	}

	.charts {
		display: grid;
		grid-template-columns: minmax(16rem, 0.8fr) minmax(18rem, 1.2fr);
		gap: 0.75rem;
	}

	.charts.extra {
		grid-template-columns: 1fr 1fr;
	}

	.charts h2,
	.months h2 {
		margin: 0 0 0.85rem;
		font-size: 1.05rem;
	}

	.donut-wrap {
		display: grid;
		grid-template-columns: 11.5rem 1fr;
		gap: 0.5rem 1rem;
		align-items: center;
	}

	.donut-wrap svg {
		width: 100%;
		height: auto;
	}

	.hole {
		fill: var(--ink);
		font-family: var(--display);
		font-size: 22px;
		font-weight: 650;
	}

	.hole-unit,
	.tick {
		fill: var(--muted);
		font-size: 12px;
		font-weight: 700;
	}

	.legend {
		display: grid;
		gap: 0.7rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.legend li {
		display: grid;
		grid-template-columns: 0.7rem 1fr;
		gap: 0.15rem 0.55rem;
		align-items: center;
	}

	.legend i {
		grid-row: span 2;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
	}

	.legend span {
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.hbars {
		display: grid;
		gap: 0.9rem;
	}

	.hbar-top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.35rem;
		font-size: 0.92rem;
	}

	.hbar-top span {
		color: var(--muted);
		font-weight: 700;
	}

	.track {
		height: 0.85rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--wine-soft);
	}

	.track span {
		display: block;
		height: 100%;
		border-radius: inherit;
	}

	.mix {
		display: flex;
		height: 1.35rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--wine-soft);
	}

	.mix span {
		display: block;
		height: 100%;
	}

	.mix-legend {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 0.9rem 0 0;
		padding: 0;
		list-style: none;
	}

	.mix-legend li {
		display: grid;
		grid-template-columns: 0.7rem 1fr;
		gap: 0.1rem 0.5rem;
		align-items: center;
	}

	.mix-legend i {
		grid-row: span 2;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
	}

	.mix-legend span {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.plot {
		overflow-x: auto;
	}

	.columns {
		display: block;
		width: 100%;
		min-width: 28rem;
		height: auto;
	}

	.months ul {
		display: grid;
		gap: 0.85rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.month-top,
	dl {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.month-top strong {
		font-size: 1rem;
	}

	.month-top span,
	dd,
	.legend strong {
		font-variant-numeric: tabular-nums;
		font-weight: 650;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0;
	}

	dt {
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.15rem 0 0;
	}

	.scale {
		margin-top: 0.85rem;
	}

	@media (max-width: 860px) {
		.board,
		.branches,
		.charts,
		.charts.extra,
		.donut-wrap,
		.mix-legend,
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
