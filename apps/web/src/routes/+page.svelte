<script>
	import { APP_NAME } from '@satet/shared';
	import Button from '#lib/components/Button.svelte';

	let { data } = $props();

	const photo = (n) => `/landing/${encodeURIComponent(`satet (${n}).jpeg`)}`;
	const gallery = [1, 2, 4, 12, 13, 14, 15, 16, 17, 18, 19, 20];
</script>

<svelte:head>
	<title>{APP_NAME} · Servicio de Administración Tributaria del Estado Trujillo</title>
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
			<div class="intro">
				<p class="kicker">Gobernación del Estado Trujillo</p>
				<h1>Servicio de Administración Tributaria del Estado Trujillo</h1>
				<p class="lede">
					Recaudamos y administramos los tributos del estado, y acompañamos al contribuyente para cumplir sus deberes con claridad.
				</p>
				<div class="actions">
					{#if data.user}
						<Button href="/panel" variant="light">Continuar en el panel</Button>
					{:else}
						<Button href="/login" variant="light">Iniciar sesión</Button>
						<Button href="/registro" variant="inverse">Crear cuenta</Button>
					{/if}
				</div>
			</div>
			<figure class="shot tall">
				<img src={photo(5)} alt="Atención en la taquilla única del SATET" />
			</figure>
		</div>
	</header>

	<main>
		<figure class="shot wide">
			<img src={photo(3)} alt="Reunión de trabajo del equipo del SATET" />
		</figure>

		<section class="story">
			<div class="copy">
				<p class="eyebrow">Objetivo</p>
				<h2>Organizar la hacienda pública del estado.</h2>
				<p>
					El SATET recauda, controla y administra los tributos asignados al Estado Trujillo, incluida la minería no metálica, y fiscaliza para que cada recurso llegue a la hacienda pública.
				</p>
			</div>
			<figure class="shot">
				<img src={photo(10)} alt="Consulta de expedientes en el SATET" />
			</figure>
		</section>

		<section class="pair">
			<article>
				<figure class="shot">
					<img src={photo(6)} alt="Sellado de documentos tributarios" />
				</figure>
				<div class="copy">
					<p class="eyebrow">Misión</p>
					<h2>Hacer cumplir la norma, con calidad.</h2>
					<p>
						Aplicamos la normativa tributaria con herramientas gerenciales y tecnológicas, para servir al Ejecutivo y a los contribuyentes.
					</p>
				</div>
			</article>
			<article>
				<figure class="shot">
					<img src={photo(11)} alt="Material informativo del SATET" />
				</figure>
				<div class="copy">
					<p class="eyebrow">Visión</p>
					<h2>Un servicio cómodo y de vanguardia.</h2>
					<p>
						Procesos simples para el contribuyente y una recaudación sólida en el corto, mediano y largo plazo.
					</p>
				</div>
			</article>
		</section>

		<section class="story reverse">
			<figure class="shot">
				<img src={photo(7)} alt="Atención a una contribuyente en oficina" />
			</figure>
			<div class="copy">
				<p class="eyebrow">Contribuyente</p>
				<h2>Un lugar cómodo para cumplir.</h2>
				<p>
					Declaraciones, timbres y pagos viven en el mismo expediente. El trámite se entiende de principio a fin, sin recorrer varias oficinas para saber en qué va.
				</p>
			</div>
		</section>

		<section class="story">
			<div class="copy">
				<p class="eyebrow">En el estado</p>
				<h2>La minería no metálica también pasa por aquí.</h2>
				<p>
					El control tributario cubre la actividad minera no metálica del estado, junto con impuestos, tasas y los demás conceptos que alimentan la hacienda pública.
				</p>
			</div>
			<figure class="shot">
				<img src={photo(9)} alt="Personal del SATET organizando trámites" />
			</figure>
		</section>

		<section class="gallery">
			<div class="copy">
				<p class="eyebrow">El equipo</p>
				<h2>Así se trabaja en el SATET.</h2>
			</div>
			<div class="mosaic">
				{#each gallery as n (n)}
					<figure class="shot">
						<img src={photo(n)} alt="Personal del SATET" />
					</figure>
				{/each}
			</div>
		</section>

		<section class="close">
			<div class="copy">
				<p class="eyebrow light">Entrar</p>
				<h2>Tu expediente, en un solo lugar.</h2>
				<p>
					Crea tu cuenta, presenta lo que te corresponde y consulta el estado de cada trámite cuando lo necesites.
				</p>
				<div class="actions">
					{#if data.user}
						<Button href="/panel" variant="light">Ir al panel</Button>
					{:else}
						<Button href="/login" variant="light">Iniciar sesión</Button>
						<Button href="/registro" variant="inverse">Crear cuenta</Button>
					{/if}
				</div>
			</div>
			<figure class="shot dark">
				<img src={photo(8)} alt="Preparación de timbres fiscales" />
			</figure>
		</section>
	</main>
</div>

<style>
	.home {
		min-height: 100vh;
		background: var(--canvas);
	}

	header {
		padding: 1.1rem 1.25rem 4.5rem;
		background:
			radial-gradient(720px 320px at 100% 0%, rgb(255 255 255 / 0.08), transparent 68%),
			var(--wine-deep);
		color: var(--sidebar-text);
	}

	.bar,
	.hero,
	main {
		width: min(1120px, 100%);
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
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
		gap: 2.5rem;
		align-items: end;
		padding-top: 3.2rem;
	}

	.kicker,
	.eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.kicker {
		color: var(--sidebar-muted);
	}

	.eyebrow {
		color: var(--wine);
	}

	.eyebrow.light {
		color: var(--sidebar-muted);
	}

	h1 {
		margin: 0;
		max-width: 12ch;
		color: #fff;
		font-size: clamp(2.6rem, 5vw, 4.4rem);
	}

	h2 {
		margin: 0 0 0.65rem;
		font-size: clamp(1.7rem, 2.4vw, 2.35rem);
	}

	.lede,
	.copy p {
		margin: 0;
		font-size: 1.05rem;
	}

	.lede {
		max-width: 34rem;
		margin-top: 1rem;
		color: var(--sidebar-muted);
	}

	.copy p {
		max-width: 36rem;
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.6rem;
	}

	main {
		display: grid;
		gap: 2.4rem;
		margin-top: -2.4rem;
		padding: 0 1.25rem 4.5rem;
	}

	.shot {
		position: relative;
		overflow: hidden;
		min-height: 16rem;
		margin: 0;
		border-radius: 1.7rem;
		background: #d5e6db;
		box-shadow: inset 0 0 0 1px rgb(15 46 34 / 0.08);
	}

	.shot img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.tall {
		min-height: 26rem;
		background:
			linear-gradient(160deg, rgb(255 255 255 / 0.16), transparent 42%),
			linear-gradient(180deg, #2d6a4f, #0f2e22);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
	}

	.gallery {
		display: grid;
		gap: 1.1rem;
	}

	.mosaic {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.mosaic .shot {
		min-height: 0;
		aspect-ratio: 4 / 3;
	}

	.wide {
		min-height: 18rem;
		aspect-ratio: 21 / 8;
	}

	.story,
	.pair {
		display: grid;
		gap: 1.15rem;
		align-items: center;
	}

	.story {
		grid-template-columns: minmax(0, 1.05fr) minmax(16rem, 0.95fr);
	}

	.story.reverse {
		grid-template-columns: minmax(16rem, 0.95fr) minmax(0, 1.05fr);
	}

	.story .shot {
		min-height: 22rem;
	}

	.pair {
		grid-template-columns: 1fr 1fr;
	}

	.copy,
	article {
		display: grid;
		align-content: end;
	}

	.copy {
		padding: 0.4rem 0.15rem;
	}

	article {
		gap: 1rem;
		padding: 0.85rem;
		border: 1px solid var(--line);
		border-radius: 1.8rem;
		background: var(--surface);
		box-shadow: 0 16px 40px rgb(15 46 34 / 0.06);
	}

	article .shot {
		min-height: 16rem;
		aspect-ratio: 4 / 3;
	}

	.close {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(16rem, 0.95fr);
		gap: 2rem;
		align-items: center;
		margin-top: 0.4rem;
		padding: 1.5rem;
		border-radius: 1.9rem;
		background:
			radial-gradient(420px 180px at 0% 0%, rgb(255 255 255 / 0.08), transparent 70%),
			var(--wine-deep);
		color: var(--sidebar-text);
	}

	.close h2 {
		color: #fff;
	}

	.close .copy p {
		color: var(--sidebar-muted);
	}

	.dark {
		min-height: 20rem;
		background:
			linear-gradient(160deg, rgb(255 255 255 / 0.16), transparent 42%),
			linear-gradient(180deg, #2d6a4f, #0f2e22);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
	}

	@media (max-width: 860px) {
		.mosaic {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 860px) {
		.hero,
		.story,
		.pair,
		.close {
			grid-template-columns: 1fr;
		}

		.close {
			display: grid;
		}

		h1 {
			max-width: none;
		}

		.tall,
		.wide {
			min-height: 14rem;
			aspect-ratio: 4 / 3;
		}
	}
</style>
