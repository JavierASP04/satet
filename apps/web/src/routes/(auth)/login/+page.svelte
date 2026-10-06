<script lang="ts">
	import ModulePlaceholder from '#lib/components/ModulePlaceholder.svelte';
</script>

<ModulePlaceholder
	module="01"
	title="Iniciar sesión"
	description="Autenticación con JWT en la cookie de sesión."
	endpoints={['POST /api/v1/auth/login']}
/>
