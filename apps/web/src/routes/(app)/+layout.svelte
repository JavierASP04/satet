<script>
	import { page } from '$app/state';
	import { APP_NAME, ROLE_LABELS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import { visibleNavigation } from '#lib/navigation.js';

	let { data, children } = $props();
	const groups = $derived(visibleNavigation(data.user.role));
</script>

<div class="shell">
	<aside>
		<a class="brand" href="/panel">
			<span class="mark">S</span>
			<span>
				<strong>{APP_NAME}</strong>
				<small>Estado Trujillo</small>
			</span>
		</a>
		<nav>
			{#each groups as group (group.label)}
				<div class="group">
					<p>{group.label}</p>
					<ul>
						{#each group.items as item (item.href)}
							<li>
								<a
									href={item.href}
									aria-current={page.url.pathname === item.href ? 'page' : undefined}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<div class="who">
				<p>{data.user.email}</p>
				<p>{ROLE_LABELS[data.user.role] ?? data.user.role}</p>
			</div>
			<form method="POST" action="/salir">
				<Button type="submit" variant="ghost">Cerrar sesión</Button>
			</form>
		</header>

		{#if data.taxpayer && !data.taxpayer.isApproved}
			<div class="banner">
				<Alert tone="warn">
					El expediente de {data.taxpayer.companyName} está pendiente de aprobación. Puedes consultar tu perfil; las declaraciones y los timbres se habilitan al aprobarlo.
				</Alert>
			</div>
		{/if}

		<main>
			{@render children()}
		</main>
	</div>
</div>

<style>
	.shell {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 16rem 1fr;
		gap: 0.85rem;
		padding: 0.85rem;
	}

	aside {
		position: sticky;
		top: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: calc(100vh - 1.7rem);
		padding: 1.1rem 0.75rem;
		overflow: auto;
		border-radius: 1.7rem;
		background: var(--wine-deep);
		color: var(--sidebar-text);
		box-shadow: var(--shadow);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.15rem 0.4rem;
		color: inherit;
		text-decoration: none;
	}

	.mark {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		place-items: center;
		border-radius: 999px;
		background: #fff;
		color: var(--wine-deep);
		font-weight: 750;
	}

	.brand strong {
		display: block;
		letter-spacing: 0.14em;
		font-size: 0.95rem;
	}

	.brand small {
		color: var(--sidebar-muted);
	}

	.group p {
		margin: 0.85rem 0.7rem 0.35rem;
		color: var(--sidebar-muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	nav a {
		display: block;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		color: inherit;
		text-decoration: none;
	}

	nav a:hover {
		background: rgb(255 255 255 / 0.08);
	}

	nav a[aria-current='page'] {
		background: #fff;
		color: var(--wine-deep);
	}

	.workspace {
		min-width: 0;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.8rem;
		padding: 0.35rem 0.2rem 0.9rem;
	}

	.who p {
		margin: 0;
		text-align: right;
	}

	.who p:first-child {
		font-weight: 700;
	}

	.who p:last-child {
		color: var(--muted);
		font-size: 0.82rem;
	}

	.banner {
		margin-bottom: 0.9rem;
	}

	main {
		padding: 0.2rem 0.15rem 1.5rem;
	}

	@media (max-width: 900px) {
		.shell {
			display: block;
			padding: 0.6rem;
		}

		aside {
			position: static;
			height: auto;
			margin-bottom: 0.8rem;
		}

		nav {
			display: flex;
			gap: 0.75rem;
			overflow-x: auto;
		}

		.group {
			min-width: max-content;
		}

		.group p {
			margin-top: 0;
		}

		.topbar {
			justify-content: space-between;
		}
	}
</style>
