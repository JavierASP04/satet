<script>
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import EntryScreen from '#lib/components/EntryScreen.svelte';
	import Form from '#lib/components/Form.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Iniciar sesión · SATET</title>
</svelte:head>

<EntryScreen title="Iniciar sesión" lede="Correo de contribuyente o de funcionario.">
	{#if data.registered}
		<Alert tone="ok">
			Cuenta creada. Ya puedes entrar. Las declaraciones quedan bloqueadas hasta que Recaudación apruebe el expediente.
		</Alert>
	{/if}

	{#if form?.message}
		<Alert>{form.message}</Alert>
	{/if}

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
			autocomplete="username"
			required
			value={form?.email ?? ''}
		/>
		<TextField
			label="Contraseña"
			name="password"
			type="password"
			autocomplete="current-password"
			reveal
			required
		/>
		<div class="submit">
			<Button disabled={submitting}>{submitting ? 'Entrando…' : 'Entrar'}</Button>
		</div>
	</Form>

	<p class="hint">La sesión permanece en este navegador durante 8 horas.</p>
	<p class="switch">
		<span>¿Primera vez?</span>
		<a href="/registro">Crear cuenta de contribuyente</a>
	</p>
</EntryScreen>

<style>
	.submit {
		margin-top: 0.2rem;
	}

	.submit :global(button) {
		width: 100%;
	}

	.hint {
		margin: 0;
		padding: 0.55rem 0.75rem;
		border-radius: 0.75rem;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.8rem;
	}

	.switch {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 0;
		padding-top: 0.9rem;
		border-top: 1px solid var(--line);
		font-size: 0.92rem;
	}

	.switch span {
		color: var(--muted);
	}

	.switch a {
		color: var(--wine-dark);
		font-weight: 700;
		text-decoration: none;
	}

	.switch a:hover {
		text-decoration: underline;
	}
</style>
