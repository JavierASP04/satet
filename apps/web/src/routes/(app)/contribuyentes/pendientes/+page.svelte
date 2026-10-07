<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="01"
	title="Solicitudes pendientes"
	description="Revisión y aprobación de expedientes por el Analista de Recaudación."
	endpoints={['GET /api/v1/taxpayers/pending', 'PATCH /api/v1/taxpayers/:id/approve']}
/>
