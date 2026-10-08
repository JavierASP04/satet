<script>
	import { APP_NAME } from '@satet/shared';
	import Button from '#lib/components/Button.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{APP_NAME}</title>
</svelte:head>

<div class="home">
	<header>
		<div class="bar">
			<a class="brand" href="/">
				<span>S</span>
				{APP_NAME}
			</a>
			<nav>
				{#if data.user}
					<Button href="/panel" variant="light">Ir al panel</Button>
				{:else}
					<Button href="/registro" variant="inverse">Registrarse</Button>
					<Button href="/login" variant="light">Iniciar sesión</Button>
				{/if}
			</nav>
		</div>

		<div class="hero">
			<p class="kicker">Gobernación del Estado Trujillo</p>
			<h1>El escritorio tributario del estado.</h1>
			<p class="lede">
				Contribuyentes, declaraciones, timbres, pagos y verificación SAREN, con la sesión de cada rol.
			</p>
			<div class="actions">
				{#if data.user}
					<Button href="/panel" variant="light">Continuar en el panel</Button>
				{:else}
					<Button href="/login" variant="light">Iniciar sesión</Button>
					<Button href="/registro" variant="inverse">Crear cuenta</Button>
				{/if}
			</div>
			<p class="count">{data.modules.length} módulos</p>
		</div>
	</header>

	<section class="board" aria-label="Módulos del sistema">
		{#each data.modules as item (item.code)}
			<article>
				<span>{item.code}</span>
				<h2>{item.name}</h2>
				<p>{item.description}</p>
			</article>
		{/each}
	</section>
</div>

<style>
	.home {
		min-height: 100vh;
		background: var(--canvas);
	}

	header {
		padding: 1.1rem 1.1rem 4.5rem;
		background:
			radial-gradient(640px 280px at 100% 0%, rgb(255 255 255 / 0.07), transparent 70%),
			var(--wine-deep);
		color: var(--sidebar-text);
	}

	.bar,
	.hero,
	.board {
		width: min(1080px, 100%);
		margin: 0 auto;
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		color: inherit;
		font-weight: 750;
		letter-spacing: 0.16em;
		text-decoration: none;
	}

	.brand span {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 999px;
		background: #fff;
		color: var(--wine-deep);
		font-size: 0.95rem;
		letter-spacing: 0;
	}

	.bar nav {
		display: flex;
		gap: 0.45rem;
	}

	.hero {
		padding-top: 3.4rem;
	}

	.kicker {
		margin: 0 0 0.8rem;
		color: var(--sidebar-muted);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		max-width: 14ch;
		color: #fff;
		font-size: clamp(2.5rem, 5vw, 4.2rem);
	}

	.lede {
		max-width: 34rem;
		margin: 1rem 0 0;
		color: var(--sidebar-muted);
		font-size: 1.05rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.5rem;
	}

	.count {
		display: inline-flex;
		margin: 1.3rem 0 0;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: var(--sidebar-text);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15.5rem, 1fr));
		gap: 0.85rem;
		margin-top: -2.4rem;
		padding: 0 1.1rem 2.5rem;
	}

	article {
		padding: 1.15rem 1.15rem 1.2rem;
		border-radius: 1.3rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	article span {
		display: inline-grid;
		min-width: 2.3rem;
		height: 2.3rem;
		place-items: center;
		padding: 0 0.45rem;
		border-radius: 999px;
		background: var(--wine-soft);
		color: var(--wine-dark);
		font-size: 0.78rem;
		font-weight: 750;
		letter-spacing: 0.04em;
	}

	h2 {
		margin: 0.8rem 0 0.35rem;
		font-size: 1.25rem;
	}

	article p {
		margin: 0;
		color: var(--muted);
		font-size: 0.94rem;
	}

	@media (max-width: 720px) {
		.bar {
			align-items: flex-start;
			flex-direction: column;
		}

		h1 {
			max-width: none;
		}
	}
</style>
