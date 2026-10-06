<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="07"
	title="Panel"
	description="Resumen general y tasa BCV vigente."
	endpoints={['GET /api/v1/bcv-rate/current', 'GET /api/v1/reports/revenue-summary']}
/>
