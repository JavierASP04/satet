<script>
	import { DOC_TYPES, ROLE_LABELS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import PropertyList from '#lib/components/PropertyList.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import SelectField from '#lib/components/SelectField.svelte';
	import TextAreaField from '#lib/components/TextAreaField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { visibleNavigation } from '#lib/navigation.js';

	let { data, form } = $props();
	let submitting = $state(false);

	const documentOptions = [
		{ value: DOC_TYPES.RIF_JURIDICO, label: 'RIF jurídico' },
		{ value: DOC_TYPES.RIF_NATURAL, label: 'RIF natural' },
		{ value: DOC_TYPES.CEDULA, label: 'Cédula' },
		{ value: DOC_TYPES.PASAPORTE, label: 'Pasaporte' }
	];

	const documentLabels = Object.fromEntries(documentOptions.map((option) => [option.value, option.label]));

	const roleSummaries = {
		ADMIN_SISTEMA: 'Administra el sistema y puede usar todos los módulos.',
		ANALISTA_RECAUDACION: 'Aprueba expedientes, supervisa declaraciones y consulta el tablero.',
		ANALISTA_TESORERIA: 'Concilia pagos y consulta el tablero de recaudación.',
		VERIFICADOR_SAREN: 'Verifica y consume timbres fiscales.'
	};

	const account = $derived([
		['Correo', data.user.email],
		['Rol', ROLE_LABELS[data.user.role] ?? data.user.role]
	]);

	const staffAccount = $derived([
		...account,
		['Estado', data.user.isActive ? 'Activa' : 'Inactiva'],
		['Alta', when(data.user.createdAt)],
		['Actualización', when(data.user.updatedAt)],
		['Identificador', data.user.id]
	]);

	const accessGroups = $derived(
		visibleNavigation(data.user.role)
			.map((group) => ({
				...group,
				items: group.items.filter((item) => item.href !== '/panel')
			}))
			.filter((group) => group.items.length > 0)
	);

	const description = $derived(
		data.taxpayer
			? 'Datos de la cuenta y del expediente de contribuyente.'
			: 'Datos de la cuenta institucional y los accesos de tu rol.'
	);

	/** @param {string | null | undefined} value */
	function when(value) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('es-VE', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Caracas'
		}).format(new Date(value));
	}

	const editable = $derived(Boolean(data.taxpayer) && !data.taxpayer.isApproved);

	const rows = $derived.by(() => {
		const taxpayer = data.taxpayer;
		if (!taxpayer) return [];
		return [
			['Tipo de documento', documentLabels[taxpayer.docType] ?? taxpayer.docType],
			['RIF', taxpayer.rifNumber],
			['Razón social', taxpayer.companyName],
			['Denominación comercial', taxpayer.commercialDenomination || '—'],
			['Dirección fiscal', taxpayer.fiscalAddress],
			['Teléfono', taxpayer.phoneNumber],
			['Representante legal', taxpayer.legalRepresentativeName],
			['Cédula del representante', taxpayer.legalRepresentativeDna],
			['Expediente', 'Aprobado']
		];
	});

	/** @param {string} name */
	function field(name) {
		if (form?.values && Object.hasOwn(form.values, name)) return form.values[name] ?? '';
		return data.taxpayer?.[name] ?? '';
	}
</script>

<Screen module="01" title="Mi perfil" {description} ready>
	<div class="stack">
		{#if form?.message}
			<Alert tone={form.ok ? 'ok' : 'danger'}>{form.message}</Alert>
		{/if}

		{#if data.taxpayer && !editable}
			<div class="pair">
				<PropertyList title="Cuenta" rows={account} />
				<PropertyList title="Expediente" {rows} />
			</div>
			<p class="lock">El expediente ya fue aprobado y no se puede modificar.</p>
		{:else if data.taxpayer}
			<PropertyList title="Cuenta" rows={account} />
		{/if}

		{#if !data.taxpayer}
			<PropertyList title="Cuenta" rows={staffAccount} />
			<section class="editor">
				<h2>Accesos</h2>
				<p class="hint">{roleSummaries[data.user.role] ?? 'Cuenta institucional, sin expediente de contribuyente.'}</p>
				<ul class="access">
					{#each accessGroups as group (group.label)}
						<li>
							<p>{group.label}</p>
							<div class="links">
								{#each group.items as item (item.href)}
									<a href={item.href}>{item.label}</a>
								{/each}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{:else if editable}
			<section class="editor">
				<h2>Expediente</h2>
				<p class="hint">Puedes corregir estos datos hasta que Recaudación apruebe el expediente.</p>
				<Form
					method="POST"
					columns={2}
					submit={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<SelectField
						label="Tipo de documento"
						name="docType"
						required
						options={documentOptions}
						value={field('docType')}
					/>
					<TextField label="RIF" name="rifNumber" required placeholder="J-12345678-9" value={field('rifNumber')} />
					<TextField
						label="Razón social"
						name="companyName"
						required
						maxlength="255"
						span={2}
						value={field('companyName')}
					/>
					<TextField
						label="Denominación comercial"
						name="commercialDenomination"
						maxlength="255"
						span={2}
						value={field('commercialDenomination')}
					/>
					<TextAreaField
						label="Dirección fiscal"
						name="fiscalAddress"
						required
						maxlength="2000"
						span={2}
						value={field('fiscalAddress')}
					/>
					<TextField label="Teléfono" name="phoneNumber" required maxlength="20" value={field('phoneNumber')} />
					<TextField
						label="Representante legal"
						name="legalRepresentativeName"
						required
						maxlength="255"
						value={field('legalRepresentativeName')}
					/>
					<TextField
						label="Cédula del representante"
						name="legalRepresentativeDna"
						required
						maxlength="20"
						span={2}
						value={field('legalRepresentativeDna')}
					/>
					<div class="actions">
						<Button disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar expediente'}</Button>
					</div>
				</Form>
			</section>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.pair {
		display: grid;
		grid-template-columns: minmax(16rem, 0.8fr) minmax(18rem, 1.2fr);
		gap: 0.85rem;
		align-items: start;
	}

	.editor {
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
	.lock {
		margin: 0.45rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.editor :global(form) {
		margin-top: 1rem;
	}

	.actions {
		grid-column: 1 / -1;
	}

	.access {
		display: grid;
		gap: 0.9rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.access p {
		margin: 0 0 0.4rem;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.links a {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.88rem;
		font-weight: 650;
		text-decoration: none;
	}

	.links a:hover {
		background: var(--wine);
		color: #fff;
	}

	@media (max-width: 860px) {
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
