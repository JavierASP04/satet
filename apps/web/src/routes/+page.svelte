<script lang="ts">
	import { APP_FULL_NAME, APP_NAME } from '@satet/shared';
</script>

<svelte:head>
	<title>{APP_NAME}</title>
</svelte:head>

<main>
	<h1>{APP_NAME}</h1>
	<p>{APP_FULL_NAME}</p>
	<nav>
		<a href="/login">Iniciar sesión</a>
		<a href="/registro">Registrarse</a>
		<a href="/panel">Ir al panel</a>
	</nav>
</main>

<style>
	main {
		min-height: 100vh;
		display: grid;
		place-content: center;
		text-align: center;
		gap: 0.5rem;
	}

	nav {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin-top: 1rem;
	}
</style>
