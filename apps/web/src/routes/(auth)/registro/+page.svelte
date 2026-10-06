<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="01"
	title="Registro de contribuyente"
	description="Autoregistro de empresas y entes. La cuenta queda pendiente de aprobación por Recaudación."
	endpoints={['POST /api/v1/auth/register']}
/>
