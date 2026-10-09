<script>
	import { APP_NAME } from '@satet/shared';

	let { title = '', lede = '', wide = false, toolbar, children } = $props();
</script>

<main class="screen">
	<section class="sheet" class:wide>
		<header>
			<span class="badge" aria-hidden="true">S</span>
			<div>
				<a href="/">{APP_NAME}</a>
				<p>Estado Trujillo</p>
			</div>
		</header>
		{#if toolbar}
			{@render toolbar()}
		{/if}
		{#if title}
			<h1>{title}</h1>
		{/if}
		{#if lede}
			<p class="lede">{lede}</p>
		{/if}
		{@render children()}
	</section>
	<p class="org">Gobernación del Estado Trujillo</p>
</main>

<style>
	.screen {
		min-height: 100vh;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.9rem;
		padding: 1.75rem 1rem;
		background:
			radial-gradient(680px 280px at 50% -8%, rgb(122 36 51 / 0.7), transparent 62%),
			radial-gradient(420px 320px at 100% 110%, rgb(92 21 36 / 0.55), transparent 60%),
			var(--wine-deep);
	}

	.sheet {
		position: relative;
		width: min(100%, 24rem);
		display: grid;
		gap: 0.85rem;
		padding: 1.45rem 1.4rem 1.25rem;
		overflow: hidden;
		border: 1px solid rgb(255 252 250 / 0.14);
		border-radius: 1.6rem;
		background: var(--surface);
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.65) inset,
			0 30px 70px rgb(0 0 0 / 0.34);
		view-transition-name: auth-sheet;
		transition: width 460ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sheet::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: 0;
		height: 3px;
		background: linear-gradient(90deg, var(--wine-deep), var(--wine));
	}

	.wide {
		width: min(100%, 46rem);
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid var(--line);
	}

	.badge {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		place-items: center;
		border-radius: 999px;
		background: var(--wine-deep);
		color: var(--sidebar-text);
		font-weight: 700;
	}

	header a {
		color: var(--wine-deep);
		font-size: 0.95rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-decoration: none;
	}

	header p {
		margin: 0.05rem 0 0;
		color: var(--muted);
		font-size: 0.78rem;
	}

	h1 {
		margin: 0.2rem 0 0;
		font-size: 1.85rem;
	}

	.lede {
		margin: -0.25rem 0 0.15rem;
		color: var(--muted);
	}

	.org {
		margin: 0;
		color: var(--sidebar-muted);
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		view-transition-name: auth-org;
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transition: none;
		}
	}
</style>
