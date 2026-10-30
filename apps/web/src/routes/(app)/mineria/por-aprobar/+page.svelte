<script>
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { money, periodLabel } from '#lib/mining.js';

	let { data, form } = $props();
</script>

<Screen
	module="02"
	title="Por aprobar"
	description="Declaraciones y regalías que esperan la decisión del administrador. El uno por mil se resuelve en Retenciones."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}

		<section>
			<h2>Minería</h2>
			{#if data.declarations.length === 0}
				<p class="note">No hay declaraciones mineras pendientes.</p>
			{:else}
				<DataTable>
					<thead>
						<tr>
							<th>Contribuyente</th>
							<th>Período</th>
							<th>Total</th>
							<th>Aviso</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.declarations as declaration (declaration.id)}
							<tr>
								<td>
									<strong>{declaration.companyName}</strong>
									<div class="sub">{declaration.rifNumber}</div>
								</td>
								<td>{periodLabel(declaration.periodYear, declaration.periodMonth)}</td>
								<td>{money(declaration.totalVed)}</td>
								<td>
									{#if declaration.isExtemporaneous}
										<span class="late">Fuera de tiempo</span>
									{:else}
										En término
									{/if}
								</td>
								<td><a href="/mineria/{declaration.id}">Revisar</a></td>
							</tr>
						{/each}
					</tbody>
				</DataTable>
			{/if}
		</section>

		<section>
			<h2>Regalías</h2>
			{#if data.royalties.length === 0}
				<p class="note">No hay regalías pendientes.</p>
			{:else}
				<DataTable>
					<thead>
						<tr>
							<th>Contribuyente</th>
							<th>Año</th>
							<th>Monto</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.royalties as royalty (royalty.id)}
							<tr>
								<td>
									<strong>{royalty.companyName}</strong>
									<div class="sub">{royalty.rifNumber}</div>
								</td>
								<td>{royalty.periodYear}</td>
								<td>{money(royalty.amountVed)}</td>
								<td>
									<form method="POST" action="?/resolveRoyalty" use:enhance>
										<input type="hidden" name="id" value={royalty.id} />
										<input type="hidden" name="decision" value="APROBAR" />
										<Button>Aprobar</Button>
									</form>
									<form class="reject" method="POST" action="?/resolveRoyalty" use:enhance>
										<input type="hidden" name="id" value={royalty.id} />
										<input type="hidden" name="decision" value="RECHAZAR" />
										<TextField label="Motivo" name="rejectionReason" required maxlength="500" />
										<Button variant="ghost">Rechazar</Button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</DataTable>
			{/if}
		</section>

		<p class="note"><a href="/uno-por-mil">Revisar cargas del uno por mil</a></p>
	</div>
</Screen>

<style>
	.stack,
	section {
		display: grid;
		gap: 0.75rem;
	}

	h2 {
		margin: 0.4rem 0 0;
		font-size: 1.2rem;
	}

	.note,
	.sub {
		margin: 0;
		color: var(--muted);
	}

	.late {
		color: #9b1c1c;
		font-size: 1.05rem;
		font-weight: 800;
	}

	form,
	.reject {
		display: grid;
		gap: 0.45rem;
		margin: 0 0 0.45rem;
	}
</style>
