<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="07"
	title="Dashboard POA"
	description="Recaudación mensual vs. meta, desglose por ramo y exportaciones."
	endpoints={[
		'GET /api/v1/reports/revenue-summary',
		'GET /api/v1/reports/export/excel',
		'GET /api/v1/reports/export/pdf'
	]}
/>
