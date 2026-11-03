<script>
	import Alert from '#lib/components/Alert.svelte';

	let { children } = $props();
</script>

<Alert tone="warn">
	{#if children}
		{@render children()}
	{:else}
		Pantalla estática. El formulario y los datos de ejemplo no se envían al servicio.
	{/if}
</Alert>
