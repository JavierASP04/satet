<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="05"
	title="Conciliación de pagos"
	description="Verificación o rechazo de pagos por Tesorería."
	endpoints={[
		'GET /api/v1/payments/pending',
		'PATCH /api/v1/payments/:id/verify',
		'PATCH /api/v1/payments/:id/reject'
	]}
/>
