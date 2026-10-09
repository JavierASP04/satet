<script>
	import { flushSync, untrack } from 'svelte';
	import { DOC_TYPES } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import EntryScreen from '#lib/components/EntryScreen.svelte';
	import Form from '#lib/components/Form.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextAreaField from '#lib/components/TextAreaField.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let { form } = $props();
	let submitting = $state(false);
	let step = $state(untrack(() => (form?.message ? 2 : 1)));
	let animating = $state(false);
	let viewport = $state(null);
	let reel = $state(null);
	let accountPane = $state(null);
	let filePane = $state(null);

	const values = $derived(form?.values ?? {});
	const ease = '440ms cubic-bezier(0.22, 1, 0.36, 1)';

	const documents = [
		{ value: DOC_TYPES.RIF_JURIDICO, label: 'RIF jurídico' },
		{ value: DOC_TYPES.RIF_NATURAL, label: 'RIF natural' },
		{ value: DOC_TYPES.CEDULA, label: 'Cédula' },
		{ value: DOC_TYPES.PASAPORTE, label: 'Pasaporte' }
	];

	function waitForSlide(element) {
		return new Promise((resolve) => {
			const timer = setTimeout(finish, 520);
			function finish() {
				clearTimeout(timer);
				element.removeEventListener('transitionend', onEnd);
				resolve();
			}
			function onEnd(event) {
				if (event.target === element && event.propertyName === 'transform') finish();
			}
			element.addEventListener('transitionend', onEnd);
		});
	}

	async function move(next) {
		if (next === step || animating || !viewport || !reel) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			step = next;
			return;
		}

		const fromHeight = viewport.offsetHeight;
		const goingForward = next > step;
		viewport.style.overflow = 'hidden';
		viewport.style.height = `${fromHeight}px`;

		flushSync(() => {
			animating = true;
			step = next;
		});

		const target = next === 2 ? filePane : accountPane;
		const toHeight = target?.offsetHeight ?? fromHeight;
		reel.style.transition = 'none';
		reel.style.transform = goingForward ? 'translateX(0)' : 'translateX(-50%)';
		reel.getBoundingClientRect();
		reel.style.transition = `transform ${ease}`;
		viewport.style.transition = `height ${ease}`;
		reel.style.transform = goingForward ? 'translateX(-50%)' : 'translateX(0)';
		viewport.style.height = `${toHeight}px`;

		await waitForSlide(reel);

		flushSync(() => {
			animating = false;
		});
		reel.style.transition = 'none';
		reel.style.transform = '';
		viewport.style.transition = 'none';
		viewport.style.height = '';
		viewport.style.overflow = '';
	}
</script>

<svelte:head>
	<title>Registro · SATET</title>
</svelte:head>

{#snippet steps()}
	<ol class="track">
		<li class:on={step === 1} class:done={step > 1} aria-current={step === 1 ? 'step' : undefined}>
			<span>1</span>
			Cuenta
		</li>
		<li class:on={step === 2} aria-current={step === 2 ? 'step' : undefined}>
			<span>2</span>
			Expediente
		</li>
	</ol>
{/snippet}

<EntryScreen wide toolbar={steps}>
	{#if form?.message}
		<Alert>{form.message}</Alert>
	{/if}

	<Form
		method="POST"
		submit={({ cancel }) => {
			if (step === 1) {
				cancel();
				move(2);
				return;
			}

			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div class="viewport" bind:this={viewport}>
			<div class="reel" class:motion={animating} bind:this={reel}>
				<div
					class="pane"
					class:off={step !== 1 && !animating}
					inert={step !== 1}
					bind:this={accountPane}
				>
					<div class="account">
						<h1>Crea tu cuenta</h1>
						<p class="lede">Dos pasos. Primero el acceso; después los datos fiscales.</p>
						<TextField
							label="Correo"
							name="email"
							type="email"
							autocomplete="username"
							required
							value={values.email ?? ''}
						/>
						<TextField
							label="Contraseña"
							name="password"
							type="password"
							autocomplete="new-password"
							minlength="8"
							maxlength="72"
							reveal
							required
						/>
						<p class="note">Mínimo 8 caracteres. La usarás para entrar al escritorio.</p>
						<div class="actions">
							<Button type={step === 1 ? 'submit' : 'button'} disabled={submitting || animating}>
								Continuar
							</Button>
							<Button href="/login" variant="ghost">Ya tengo cuenta</Button>
						</div>
					</div>
				</div>

				<div
					class="pane file"
					class:off={step !== 2 && !animating}
					inert={step !== 2}
					bind:this={filePane}
				>
					<h1>Completa el expediente</h1>
					<p class="lede">
						La cuenta queda pendiente de aprobación. Puedes entrar de inmediato; declarar espera la revisión de Recaudación.
					</p>
					<SelectField
						label="Tipo de documento"
						name="docType"
						required={step === 2}
						options={documents}
						value={values.docType ?? ''}
					/>
					<TextField
						label="RIF"
						name="rifNumber"
						required={step === 2}
						placeholder="J-12345678-9"
						value={values.rifNumber ?? ''}
					/>
					<TextField
						label="Razón social"
						name="companyName"
						required={step === 2}
						maxlength="255"
						span={2}
						value={values.companyName ?? ''}
					/>
					<TextField
						label="Denominación comercial"
						name="commercialDenomination"
						maxlength="255"
						span={2}
						value={values.commercialDenomination ?? ''}
					/>
					<TextAreaField
						label="Dirección fiscal"
						name="fiscalAddress"
						required={step === 2}
						span={2}
						value={values.fiscalAddress ?? ''}
					/>
					<TextField
						label="Teléfono"
						name="phoneNumber"
						required={step === 2}
						maxlength="20"
						value={values.phoneNumber ?? ''}
					/>
					<TextField
						label="Representante legal"
						name="legalRepresentativeName"
						required={step === 2}
						maxlength="255"
						value={values.legalRepresentativeName ?? ''}
					/>
					<TextField
						label="Cédula del representante"
						name="legalRepresentativeDna"
						required={step === 2}
						maxlength="20"
						span={2}
						value={values.legalRepresentativeDna ?? ''}
					/>
					<div class="actions">
						<Button type="button" variant="ghost" disabled={animating} onclick={() => move(1)}>
							Volver
						</Button>
						<Button type={step === 2 ? 'submit' : 'button'} disabled={submitting || animating}>
							{submitting ? 'Creando cuenta…' : 'Crear cuenta'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Form>
</EntryScreen>

<style>
	.track {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.track li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.65rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--muted);
		font-size: 0.82rem;
		font-weight: 650;
		transition:
			background 0.35s ease,
			color 0.35s ease,
			box-shadow 0.35s ease;
	}

	.track li span {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		place-items: center;
		border-radius: 999px;
		background: #fff;
		color: var(--wine-dark);
		font-size: 0.75rem;
	}

	.track li.done {
		background: var(--wine);
		color: #fff;
	}

	.track li.on {
		background: var(--wine-deep);
		color: var(--sidebar-text);
		box-shadow: 0 8px 18px rgb(58 16 24 / 0.22);
	}

	.track li.done span,
	.track li.on span {
		background: #fff;
		color: var(--wine-deep);
	}

	.viewport {
		grid-column: 1 / -1;
	}

	.reel {
		display: flex;
		align-items: flex-start;
	}

	.reel.motion {
		width: 200%;
	}

	.pane {
		width: 100%;
		flex: none;
		min-width: 0;
		display: grid;
		gap: 0.95rem;
		align-content: start;
	}

	.reel.motion .pane {
		width: 50%;
	}

	.pane.off {
		display: none;
	}

	.account {
		display: grid;
		gap: 0.95rem;
		width: min(100%, 24rem);
		margin-inline: auto;
	}

	.file {
		grid-template-columns: 1fr 1fr;
	}

	h1,
	.lede,
	.note,
	.actions {
		grid-column: 1 / -1;
	}

	h1 {
		margin: 0.2rem 0 0;
		font-size: 1.85rem;
	}

	.lede {
		margin: -0.25rem 0 0.15rem;
		color: var(--muted);
	}

	.note {
		margin: -0.2rem 0 0;
		color: var(--muted);
		font-size: 0.82rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.15rem;
		padding-top: 0.95rem;
		border-top: 1px solid var(--line);
	}

	@media (max-width: 720px) {
		.file {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.track li {
			transition: none;
		}
	}
</style>
