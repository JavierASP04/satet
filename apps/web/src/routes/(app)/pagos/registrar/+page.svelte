<script>
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="05"
	title="Registrar pago"
	description="Registro de transferencia y váucher en la cuenta institucional correspondiente."
	endpoints={['POST /api/v1/payments/upload']}
/>
