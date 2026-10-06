<script lang="ts">
	import { page } from '$app/state';
	import { APP_NAME } from '@satet/shared';
	import { NAVIGATION } from '#lib/navigation.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="shell">
	<aside>
		<a class="brand" href="/panel">{APP_NAME}</a>
		<nav>
			{#each NAVIGATION as group (group.label)}
				<p class="group">{group.label}</p>
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
			{/each}
		</nav>
	</aside>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 16rem 1fr;
		min-height: 100vh;
	}

	aside {
		padding: 1.5rem 1rem;
		background: var(--color-sidebar);
		color: var(--color-sidebar-text);
		overflow-y: auto;
	}

	.brand {
		display: block;
		margin-bottom: 1.5rem;
		font-size: 1.4rem;
		font-weight: 700;
		color: inherit;
		text-decoration: none;
	}

	.group {
		margin: 1.25rem 0 0.4rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	nav a {
		display: block;
		padding: 0.35rem 0.6rem;
		border-radius: 0.4rem;
		color: inherit;
		text-decoration: none;
	}

	nav a:hover,
	nav a[aria-current='page'] {
		background: rgb(255 255 255 / 0.1);
	}

	main {
		padding: 2rem;
	}
</style>
