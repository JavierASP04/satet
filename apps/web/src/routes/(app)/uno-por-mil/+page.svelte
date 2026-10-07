<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="03"
	title="Retenciones 1 x 1000"
	description="Retenciones registradas sobre órdenes de pago."
	endpoints={['GET /api/v1/one-per-thousand/list']}
/>
