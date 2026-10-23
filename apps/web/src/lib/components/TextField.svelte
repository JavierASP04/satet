<script>
	let { label, value = '', span = 1, type = 'text', reveal = false, ...rest } = $props();
	let visible = $state(false);
	const inputType = $derived(reveal && visible ? 'text' : type);
</script>

<label class="field" class:reveal style:grid-column={span > 1 ? '1 / -1' : undefined}>
	<span>{label}</span>
	<input type={inputType} {value} {...rest} />
	{#if reveal}
		<button
			type="button"
			onclick={() => (visible = !visible)}
			aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
		>
			{visible ? 'Ocultar' : 'Mostrar'}
		</button>
	{/if}
</label>

<style>
	.field {
		position: relative;
		display: grid;
		gap: 0.45rem;
	}

	span {
		font-size: 0.88rem;
		font-weight: 650;
		color: var(--ink);
	}

	input {
		width: 100%;
		padding: 0.8rem 0.95rem;
		border: 1px solid var(--line);
		border-radius: 0.85rem;
		background: #fff;
		color: var(--ink);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.reveal input {
		padding-right: 5.4rem;
	}

	.reveal button {
		position: absolute;
		right: 0.4rem;
		bottom: 0.38rem;
		padding: 0.28rem 0.65rem;
		border: 0;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	input:focus {
		outline: none;
		border-color: var(--wine);
		background: #fff;
		box-shadow: 0 0 0 4px var(--wine-soft);
	}

	input::placeholder {
		color: #a09088;
	}
</style>
