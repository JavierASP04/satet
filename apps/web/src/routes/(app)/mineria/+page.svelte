<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="02"
	title="Mis declaraciones mineras"
	description="Declaraciones juradas mensuales de extracción, procesamiento y subproductos."
	endpoints={['GET /api/v1/mining/declarations/my']}
/>
