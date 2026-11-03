<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	/** @param {string | null | undefined} value */
	function when(value) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('es-VE', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Caracas'
		}).format(new Date(value));
	}
</script>

<Screen
	module="01"
	title="Verificadores SAREN"
	description="Cuentas de personal del SAREN. Entran con correo y contraseña, sin expediente de contribuyente."
	ready
>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}
		{#if data.error}
			<Alert>{data.error}</Alert>
		{/if}

		<section class="editor">
			<h2>Nueva cuenta</h2>
			<p class="hint">El verificador verá Mi perfil, Verificar timbre e Historial.</p>
			<Form
				method="POST"
				submit={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<TextField
					label="Correo"
					name="email"
					type="email"
					autocomplete="off"
					required
					value={form?.ok ? '' : (form?.email ?? '')}
				/>
				<TextField
					label="Contraseña"
					name="password"
					type="password"
					autocomplete="new-password"
					reveal
					required
					minlength="8"
					maxlength="72"
				/>
				<div class="actions">
					<Button disabled={submitting}>{submitting ? 'Creando…' : 'Crear verificador'}</Button>
				</div>
			</Form>
		</section>

		{#if data.users.length === 0}
			<section class="empty">
				<h2>Sin verificadores</h2>
				<p>Todavía no hay cuentas SAREN.</p>
			</section>
		{:else}
			<DataTable>
				<thead>
					<tr>
						<th>Correo</th>
						<th>Estado</th>
						<th>Alta</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as user (user.id)}
						<tr>
							<td>{user.email}</td>
							<td>{user.isActive ? 'Activa' : 'Inactiva'}</td>
							<td>{when(user.createdAt)}</td>
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

	.editor,
	.empty {
		padding: 1.2rem 1.3rem 1.3rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	h2 {
		margin: 0;
		font-size: 1.3rem;
	}

	.hint,
	.empty p {
		margin: 0.45rem 0 0;
		color: var(--muted);
	}

	.editor :global(form) {
		display: grid;
		gap: 0.85rem;
		max-width: 28rem;
		margin-top: 1rem;
	}

	.actions {
		display: flex;
	}
</style>
