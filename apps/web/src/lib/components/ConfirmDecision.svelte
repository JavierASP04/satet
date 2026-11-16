<script>
	import { registerConfirm } from '#lib/confirm-decision.js';
	import { onMount } from 'svelte';

	/** @type {HTMLFormElement | null} */
	let form = $state(null);
	/** @type {HTMLElement | null} */
	let sheet = $state(null);
	let tone = $state('ok');
	let lead = $state('');
	let accept = $state('Sí, continuar');

	onMount(() =>
		registerConfirm((nextForm, submitter) => {
			const text = submitter?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			const copy = describe(text);
			form = nextForm;
			tone = copy.tone;
			lead = copy.lead;
			accept = copy.accept;
		})
	);

	$effect(() => {
		if (form) sheet?.focus();
	});

	/** @param {string} text */
	function describe(text) {
		const label = text.toLowerCase();
		if (label.includes('eliminar')) {
			return {
				tone: 'danger',
				lead: 'Vas a rechazar y eliminar esta solicitud.',
				accept: 'Sí, eliminar'
			};
		}
		if (label.includes('rechaz')) {
			return {
				tone: 'danger',
				lead: 'Vas a rechazar este registro.',
				accept: 'Sí, rechazar'
			};
		}
		if (label.includes('verificar')) {
			return {
				tone: 'ok',
				lead: 'Vas a verificar este pago.',
				accept: 'Sí, verificar'
			};
		}
		if (label.includes('aprobar')) {
			return {
				tone: 'ok',
				lead: 'Vas a aprobar este registro.',
				accept: 'Sí, aprobar'
			};
		}
		return {
			tone: 'ok',
			lead: 'Esta acción quedará registrada.',
			accept: 'Sí, continuar'
		};
	}

	function cancel() {
		form = null;
	}

	function proceed() {
		const current = form;
		form = null;
		if (!current) return;
		current.dataset.confirmed = '1';
		current.requestSubmit();
	}
</script>

{#if form}
	<div class="backdrop">
		<button type="button" class="scrim" aria-label="Cancelar" onclick={cancel}></button>
		<div
			class="sheet {tone}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
			tabindex="-1"
			bind:this={sheet}
		>
			<p class="mark" aria-hidden="true">{tone === 'danger' ? '!' : '?'}</p>
			<p class="kicker">Confirmar</p>
			<h2 id="confirm-title">¿Usted está seguro?</h2>
			<p>{lead}</p>
			<div class="actions">
				<button type="button" class="choice ghost" onclick={cancel}>Cancelar</button>
				<button type="button" class="choice accept" onclick={proceed}>{accept}</button>
			</div>
		</div>
	</div>
{/if}

<svelte:window
	onkeydown={(event) => {
		if (form && event.key === 'Escape') cancel();
	}}
/>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgb(15 46 34 / 0.58);
		cursor: pointer;
		backdrop-filter: blur(3px);
	}

	.sheet {
		position: relative;
		z-index: 1;
		display: grid;
		justify-items: start;
		width: min(100%, 26rem);
		padding: 1.35rem 1.35rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background:
			radial-gradient(240px 120px at 100% 0%, rgb(31 107 69 / 0.16), transparent 70%),
			var(--surface);
		box-shadow: 0 28px 70px rgb(15 46 34 / 0.32);
		outline: none;
	}

	.sheet.danger {
		background:
			radial-gradient(240px 120px at 100% 0%, rgb(180 35 24 / 0.14), transparent 70%),
			var(--surface);
	}

	.mark {
		display: grid;
		place-items: center;
		width: 2.7rem;
		height: 2.7rem;
		margin: 0 0 0.85rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-family: var(--display);
		font-size: 1.35rem;
		font-weight: 700;
	}

	.danger .mark {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.kicker {
		margin: 0;
		color: var(--wine-dark);
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.danger .kicker {
		color: var(--danger);
	}

	h2 {
		margin: 0.3rem 0 0;
		font-size: 1.7rem;
	}

	p {
		margin: 0.55rem 0 0;
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.55rem;
		width: 100%;
		margin-top: 1.2rem;
	}

	.choice {
		min-height: 2.7rem;
		padding: 0.5rem 1.1rem;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.ghost {
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
	}

	.accept {
		border: 0;
		background: var(--wine);
		color: #fff;
	}

	.danger .accept {
		background: var(--danger);
	}

	.choice:focus-visible {
		outline: 3px solid var(--wine-soft);
		outline-offset: 2px;
	}
</style>
