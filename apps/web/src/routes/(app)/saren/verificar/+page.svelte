<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="06"
	title="Verificar timbre"
	description="Escaneo del QR o ingreso del serial; el timbre se consume una sola vez."
	endpoints={['POST /api/v1/saren/verify-stamp']}
/>
