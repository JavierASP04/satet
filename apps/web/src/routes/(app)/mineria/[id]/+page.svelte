<script>
	import { enhance } from '$app/forms';
	import { hasPermission, PERMISSIONS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { ACTIVITY_LABELS, STATUS_LABELS, money, periodLabel, volume, when } from '#lib/mining.js';

	let { data, form } = $props();

	const declaration = $derived(data.declaration);
	const lines = $derived(Array.isArray(declaration?.lines) ? declaration.lines : []);
	const payLabel = $derived(
		declaration ? (STATUS_LABELS[declaration.status] ?? declaration.status) : ''
	);
	const canResolve = $derived(hasPermission(data.user?.role, PERMISSIONS.DECLARACIONES_RESOLVER));

	/** @param {string} status */
	function payTone(status) {
		if (status === 'VERIFICADO') return 'ok';
		if (status === 'RECHAZADO') return 'bad';
		return 'wait';
	}
</script>

<Screen
	module="02"
	title="Detalle de declaración minera"
	description="Declaración presentada. La planilla se imprime cuando el administrador la aprueba."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{:else if declaration}
			<div class="board">
				<article class="sheet">
					<header>
						<p class="kicker">Período</p>
						<h2>{periodLabel(declaration.periodYear, declaration.periodMonth)}</h2>
						<p class="pill" class:late={declaration.isExtemporaneous}>
							{declaration.isExtemporaneous ? 'Fuera de tiempo' : 'En término'}
						</p>
						{#if declaration.isExtemporaneous}
							<p class="late-banner">Fuera de tiempo</p>
						{/if}
					</header>

					<section>
						<h3>Materiales</h3>
						{#each lines as line, index (index)}
							<div class="activity">
								<span>{ACTIVITY_LABELS[line.activityType] ?? line.activityType}</span>
								<strong>{line.appliedTaxRate}%</strong>
							</div>
							<p class="material">{line.materialType}</p>
							<dl>
								<div>
									<dt>Volumen</dt>
									<dd>{volume(line.volumeCubicMeters)}</dd>
								</div>
								<div>
									<dt>Valor por m³</dt>
									<dd>{money(line.commercialValuePerUnit)}</dd>
								</div>
								<div>
									<dt>Subtotal</dt>
									<dd>{money(line.subtotalVed)}</dd>
								</div>
							</dl>
						{/each}
						<p class="when">Presentada {when(declaration.declarationDate)}</p>
						{#if declaration.bankReferenceNumber}
							<p class="when">Referencia {declaration.bankReferenceNumber}</p>
						{/if}
					</section>

					{#if declaration.companyName}
						<section>
							<h3>Contribuyente</h3>
							<p class="who">{declaration.companyName}</p>
							<p class="rif">{declaration.rifNumber}</p>
						</section>
					{/if}
				</article>

				<aside class="slip">
					<p class="kicker">Estado de pago</p>
					<p class="pay {payTone(declaration.status)}">{payLabel}</p>
					<div class="total">
						<span>Total</span>
						<strong>{money(declaration.totalVed ?? declaration.subtotalVed)}</strong>
						<p>{lines.length === 1 ? '1 material' : `${lines.length} materiales`}</p>
					</div>
					{#if declaration.status === 'VERIFICADO'}
						<Button href="/mineria/{declaration.id}/planilla">Imprimir planilla</Button>
					{:else if declaration.status === 'PENDIENTE'}
						<p class="note">
							La planilla queda disponible cuando el administrador apruebe la declaración.
						</p>
					{/if}
					{#if canResolve && declaration.status === 'PENDIENTE'}
						<form method="POST" action="?/resolve" use:enhance>
							<input type="hidden" name="decision" value="APROBAR" />
							<Button>Aprobar</Button>
						</form>
						<form class="reject" method="POST" action="?/resolve" use:enhance>
							<input type="hidden" name="decision" value="RECHAZAR" />
							<TextField
								label="Motivo del rechazo"
								name="rejectionReason"
								required
								maxlength="500"
							/>
							<Button variant="ghost">Rechazar</Button>
						</form>
					{/if}
					<p class="note">
						{#if declaration.isExtemporaneous}
							Presentada fuera del lapso. No hay multa dentro del sistema.
						{:else}
							Presentada dentro de los primeros 10 días del mes.
						{/if}
					</p>
				</aside>
			</div>
		{/if}

		<div class="actions">
			{#if data.taxpayer}
				<Button href="/mineria" variant="ghost">Mis declaraciones</Button>
			{:else}
				<Button href="/mineria/extemporaneas" variant="ghost">Extemporáneas</Button>
			{/if}
		</div>
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.board {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(16.5rem, 0.75fr);
		gap: 0.85rem;
		align-items: start;
	}

	.sheet,
	.slip {
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.sheet {
		display: grid;
		gap: 1.15rem;
		padding: 1.2rem 1.25rem 1.25rem;
	}

	header,
	section {
		display: grid;
		gap: 0.45rem;
	}

	section {
		padding-top: 1.15rem;
		border-top: 1px solid var(--line);
	}

	.kicker,
	h3 {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		font-size: 1.85rem;
	}

	.pill,
	.pay {
		justify-self: start;
		margin: 0.15rem 0 0;
		padding: 0.28rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pill {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pill.late,
	.pay.wait {
		background: var(--warning-soft);
		color: var(--warning);
	}

	.pay.ok {
		background: var(--ok-soft);
		color: var(--ok);
	}

	.pay.bad {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.activity {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		max-width: 16rem;
		padding: 0.85rem 0.95rem;
		border: 1px solid var(--wine);
		border-radius: 1rem;
		background: var(--wine-soft);
	}

	.activity span {
		font-weight: 650;
	}

	.activity strong {
		color: var(--wine-dark);
		font-size: 1.15rem;
		letter-spacing: -0.04em;
	}

	.material,
	.who,
	.rif {
		margin: 0;
	}

	.material,
	.who {
		font-size: 1.15rem;
		font-weight: 650;
	}

	.rif {
		color: var(--muted);
	}

	dl {
		display: grid;
		gap: 0.7rem;
		margin: 0.35rem 0 0;
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
	}

	.slip {
		position: sticky;
		top: 1rem;
		display: grid;
		gap: 0.85rem;
		padding: 1.2rem 1.15rem 1.15rem;
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
	.total p,
	.note {
		margin: 0;
		font-size: 0.88rem;
	}

	.total span,
	.total p {
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
		color: var(--muted);
	}

	.actions {
		display: flex;
	}

	.late-banner {
		margin: 0.35rem 0 0;
		color: #9b1c1c;
		font-size: 1.7rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.reject {
		display: grid;
		gap: 0.6rem;
	}

	.when {
		margin: 0.35rem 0 0;
		color: var(--muted);
	}

	form {
		margin: 0;
	}

	@media (max-width: 980px) {
		.board {
			grid-template-columns: 1fr;
		}

		.slip {
			position: static;
		}
	}
</style>
