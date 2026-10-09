<script>
	import { DOC_TYPES, ROLE_LABELS } from '@satet/shared';
	import Placeholder from '#lib/components/Placeholder.svelte';
	import PropertyList from '#lib/components/PropertyList.svelte';
	import Screen from '#lib/components/Screen.svelte';

	let { data } = $props();

	const documents = {
		[DOC_TYPES.RIF_JURIDICO]: 'RIF jurídico',
		[DOC_TYPES.RIF_NATURAL]: 'RIF natural',
		[DOC_TYPES.CEDULA]: 'Cédula',
		[DOC_TYPES.PASAPORTE]: 'Pasaporte'
	};

	const account = $derived([
		['Correo', data.user.email],
		['Rol', ROLE_LABELS[data.user.role] ?? data.user.role]
	]);

	const rows = $derived.by(() => {
		const taxpayer = data.taxpayer;
		if (!taxpayer) return [];
		return [
			['Tipo de documento', documents[taxpayer.docType] ?? taxpayer.docType],
			['RIF', taxpayer.rifNumber],
			['Razón social', taxpayer.companyName],
			['Denominación comercial', taxpayer.commercialDenomination || '—'],
			['Dirección fiscal', taxpayer.fiscalAddress],
			['Teléfono', taxpayer.phoneNumber],
			['Representante legal', taxpayer.legalRepresentativeName],
			['Cédula del representante', taxpayer.legalRepresentativeDna],
			['Expediente', taxpayer.isApproved ? 'Aprobado' : 'Pendiente de aprobación']
		];
	});
</script>

<Screen module="01" title="Mi perfil" description="Datos de la cuenta y del expediente de contribuyente." ready>
	<div class="stack">
		<PropertyList title="Cuenta" rows={account} />
		{#if data.taxpayer}
			<PropertyList title="Expediente" {rows} />
		{:else}
			<Placeholder
				title="Sin expediente"
				text="Esta cuenta no tiene expediente de contribuyente."
			/>
		{/if}
	</div>
</Screen>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}
</style>
