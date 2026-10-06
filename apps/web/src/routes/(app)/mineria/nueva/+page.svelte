<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="02"
	title="Nueva declaración minera"
	description="Lapso declarativo: días 1 al 10 de cada mes."
	endpoints={['POST /api/v1/mining/declarations']}
/>
