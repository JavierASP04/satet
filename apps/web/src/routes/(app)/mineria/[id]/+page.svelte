<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="02"
	title="Detalle de declaración minera"
	endpoints={['GET /api/v1/mining/declarations/:id']}
/>
