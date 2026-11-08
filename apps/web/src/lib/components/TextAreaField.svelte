<script>
	let { label, value = '', span = 1, ...rest } = $props();
</script>

<label class="field" style:grid-column={span > 1 ? '1 / -1' : undefined}>
	<span>{label}</span>
	<textarea {...rest}>{value}</textarea>
</label>

<style>
	.field {
		display: grid;
		gap: 0.45rem;
	}

	span {
		font-size: 0.88rem;
		font-weight: 650;
		color: var(--ink);
	}

	textarea {
		width: 100%;
		min-height: 6.5rem;
		padding: 0.8rem 0.95rem;
		border: 1px solid var(--line);
		border-radius: 0.85rem;
		background: #fff;
		color: var(--ink);
		resize: vertical;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	textarea:focus {
		outline: none;
		border-color: var(--wine);
		background: #fff;
		box-shadow: 0 0 0 4px var(--wine-soft);
	}
</style>
