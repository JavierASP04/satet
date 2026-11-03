<script>
	import { page } from '$app/state';
	import { APP_NAME, ROLE_LABELS } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import { visibleNavigation } from '#lib/navigation.js';

	let { data, children } = $props();
	const groups = $derived(visibleNavigation(data.user.role));
	let forced = $state(/** @type {Record<string, boolean>} */ ({}));

	/**
	 * @param {string} pathname
	 * @param {string} href
	 */
	function pathMatches(pathname, href) {
		if (pathname === href) return true;
		if (href === '/panel') return false;
		return pathname.startsWith(`${href}/`);
	}

	/** @param {{ items: { href: string }[] }} group */
	function groupIsCurrent(group) {
		const pathname = page.url.pathname;
		return group.items.some((item) => pathMatches(pathname, item.href));
	}

	/**
	 * @param {string} label
	 * @param {boolean} current
	 */
	function groupIsOpen(label, current) {
		if (label in forced) return forced[label];
		return current;
	}

	/**
	 * @param {string} label
	 * @param {boolean} current
	 */
	function toggleGroup(label, current) {
		forced[label] = !groupIsOpen(label, current);
	}

	/** @param {{ module: string, label: string }} group */
	function menuId(group) {
		const slug = group.label
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-');
		return `menu-${group.module}-${slug}`;
	}

	$effect(() => {
		const pathname = page.url.pathname;
		for (const group of groups) {
			if (group.items.some((item) => pathMatches(pathname, item.href))) {
				forced[group.label] = true;
			}
		}
	});
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
				{@const current = groupIsCurrent(group)}
				{@const open = group.items.length < 2 || groupIsOpen(group.label, current)}
				<div class="group">
					{#if group.items.length > 1}
						<button
							type="button"
							aria-expanded={open}
							aria-controls={menuId(group)}
							class:open
							onclick={() => toggleGroup(group.label, current)}
						>
							{group.label}
							<span class="chevron" aria-hidden="true"></span>
						</button>
					{:else}
						<p>{group.label}</p>
					{/if}
					<ul id={menuId(group)} hidden={!open}>
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
				<span class="avatar" aria-hidden="true">{data.user.email.slice(0, 1).toUpperCase()}</span>
				<div>
					<p>{data.user.email}</p>
					<p>{ROLE_LABELS[data.user.role] ?? data.user.role}</p>
				</div>
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

	.group p,
	.group button {
		margin: 0.85rem 0.35rem 0.35rem;
		color: var(--sidebar-muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.group p {
		padding: 0 0.35rem;
	}

	.group button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: calc(100% - 0.7rem);
		padding: 0.35rem 0.45rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		font: inherit;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-align: left;
		cursor: pointer;
	}

	.group button:hover {
		background: rgb(255 255 255 / 0.08);
		color: var(--sidebar-text);
	}

	.group button:focus-visible {
		outline: 3px solid rgb(255 255 255 / 0.35);
		outline-offset: 2px;
	}

	.chevron {
		width: 0.38rem;
		height: 0.38rem;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 0.16s ease;
	}

	.group button.open .chevron {
		transform: rotate(45deg);
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
		max-width: 78rem;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.8rem;
		margin-bottom: 1rem;
		padding: 0.45rem 0.5rem 0.45rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		box-shadow: 0 10px 28px rgb(58 16 24 / 0.05);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.avatar {
		display: grid;
		width: 2.15rem;
		height: 2.15rem;
		place-items: center;
		border-radius: 999px;
		background: var(--wine-deep);
		color: #fff;
		font-weight: 750;
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

		.group p,
		.group button {
			margin-top: 0;
		}

		.topbar {
			justify-content: space-between;
		}
	}
</style>
