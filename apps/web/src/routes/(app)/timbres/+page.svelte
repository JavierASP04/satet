<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="04"
	title="Mis timbres fiscales"
	description="Timbres electrónicos emitidos con PDF y código QR."
	endpoints={['GET /api/v1/stamps/:uuid/pdf']}
/>
