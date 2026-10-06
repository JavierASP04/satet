<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="03"
	title="Cargar órdenes de pago"
	description="Carga individual o masiva de órdenes de pago."
	endpoints={['POST /api/v1/one-per-thousand/single', 'POST /api/v1/one-per-thousand/batch']}
/>
