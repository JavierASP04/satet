<script>
	let {
		href,
		type = 'submit',
		variant = 'primary',
		disabled = false,
		onclick,
		children
	} = $props();
</script>

{#if href}
	<a class="btn {variant}" {href} aria-disabled={disabled || undefined}>
		{@render children()}
	</a>
{:else}
	<button class="btn {variant}" {type} {disabled} {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.8rem;
		padding: 0.55rem 1.2rem;
		border: 1px solid transparent;
		border-radius: 999px;
		font-weight: 650;
		letter-spacing: -0.02em;
		text-decoration: none;
		cursor: pointer;
		transition:
			background 0.16s ease,
			transform 0.16s ease,
			color 0.16s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	.btn:disabled,
	.btn[aria-disabled='true'] {
		opacity: 0.55;
		cursor: wait;
		transform: none;
	}

	.primary {
		background: var(--wine);
		color: #fff;
		box-shadow: 0 10px 24px rgb(92 21 36 / 0.28);
	}

	.primary:hover {
		background: var(--wine-dark);
	}

	.ghost {
		border-color: var(--line);
		background: rgb(255 255 255 / 0.7);
		color: var(--ink);
	}

	.ghost:hover {
		background: #fff;
	}

	.light {
		background: #fff;
		color: var(--wine-deep);
	}

	.inverse {
		border-color: rgb(255 255 255 / 0.35);
		background: rgb(255 255 255 / 0.08);
		color: #fff;
	}

	.inverse:hover {
		background: rgb(255 255 255 / 0.16);
	}

	.btn:focus-visible {
		outline: 3px solid var(--wine-soft);
		outline-offset: 2px;
	}
</style>
