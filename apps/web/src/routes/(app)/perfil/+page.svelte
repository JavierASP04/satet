<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="01"
	title="Mi perfil"
	description="Datos del contribuyente y documentos del expediente."
	endpoints={['GET /api/v1/taxpayers/profile', 'PUT /api/v1/taxpayers/profile']}
/>
