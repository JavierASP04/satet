<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="06"
	title="Historial de verificaciones"
	description="Verificaciones realizadas por oficina."
	endpoints={['GET /api/v1/saren/history']}
/>
