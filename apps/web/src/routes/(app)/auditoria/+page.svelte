<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="07"
	title="Auditoría"
	description="Bitácora inmutable de acciones del sistema."
	endpoints={['GET /api/v1/audit/logs']}
/>
