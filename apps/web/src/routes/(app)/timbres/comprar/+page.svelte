<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="04"
	title="Comprar timbre fiscal"
	description="Monto en EUR convertido a VED con la tasa BCV del día."
	endpoints={['GET /api/v1/bcv-rate/current', 'POST /api/v1/stamps/purchase']}
/>
