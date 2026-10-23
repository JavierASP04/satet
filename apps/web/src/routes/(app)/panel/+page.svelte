<script>
	import { MODULES, ROLE_LABELS } from '@satet/shared';
	import { visibleNavigation } from '#lib/navigation.js';

	let { data } = $props();

	const descriptions = Object.fromEntries(MODULES.map((module) => [module.code, module.description]));
	const groups = $derived(
		visibleNavigation(data.user.role)
			.map((group) => ({
				...group,
				description: descriptions[group.module] ?? '',
				items: group.items.filter((item) => item.href !== '/panel')
			}))
			.filter((group) => group.items.length > 0)
	);
	const roleLabel = $derived(ROLE_LABELS[data.user.role] ?? data.user.role);
	const clock = deskClock();

	/** @param {Date} [date] */
	function deskClock(date = new Date()) {
		const zone = 'America/Caracas';
		const hour = Number(
			new Intl.DateTimeFormat('en-US', {
				hour: 'numeric',
				hourCycle: 'h23',
				timeZone: zone
			}).format(date)
		);
		const today = new Intl.DateTimeFormat('es-VE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: zone
		}).format(date);

		return {
			greeting: hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches',
			today: today.charAt(0).toUpperCase() + today.slice(1)
		};
	}
</script>

<svelte:head>
	<title>Panel · SATET</title>
</svelte:head>

<div class="desk">
	<header class="welcome">
		<div>
			<p class="eyebrow">{roleLabel}</p>
			<h1>{clock.greeting}</h1>
			<p class="lede">{data.user.email}</p>
		</div>
		<p class="when">{clock.today}</p>
	</header>

	<section class="board" aria-label="Módulos habilitados">
		{#each groups as group (group.label)}
			<article>
				<div class="intro">
					<span>{group.module}</span>
					<h2>{group.label}</h2>
					{#if group.description}
						<p>{group.description}</p>
					{/if}
				</div>
				<ul>
					{#each group.items as item (item.href)}
						<li>
							<a href={item.href}>
								{item.label}
								<span aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ul>
			</article>
		{/each}
	</section>
</div>

<style>
	.welcome {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.25rem;
		margin-bottom: 1.35rem;
		padding: 1.25rem 1.3rem 1.2rem;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background:
			radial-gradient(420px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 60%),
			var(--wine-deep);
		color: #fff;
	}

	.eyebrow {
		display: inline-flex;
		margin: 0;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.1);
		color: var(--sidebar-text);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0.7rem 0 0;
		color: #fff;
		font-size: clamp(2.15rem, 4vw, 3.1rem);
	}

	.lede,
	.when {
		margin: 0.55rem 0 0;
		color: var(--sidebar-muted);
	}

	.when {
		margin: 0;
		padding-bottom: 0.35rem;
		font-size: 0.95rem;
		text-align: right;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
		gap: 0.85rem;
	}

	article {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 100%;
		padding: 1.15rem 1.05rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 1.35rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.intro span {
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
		margin: 0.75rem 0 0;
		font-size: 1.35rem;
	}

	.intro p {
		margin: 0.4rem 0 0;
		color: var(--muted);
		font-size: 0.92rem;
	}

	ul {
		margin: auto 0 0;
		padding: 0.35rem 0 0;
		border-top: 1px solid var(--line);
		list-style: none;
	}

	a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 0.15rem 0;
		padding: 0.62rem 0.7rem;
		border-radius: 0.85rem;
		color: var(--ink);
		font-weight: 650;
		text-decoration: none;
	}

	a span {
		color: var(--wine);
	}

	a:hover {
		background: var(--wine-soft);
		color: var(--wine-dark);
	}

	a:focus-visible {
		outline: 3px solid var(--wine-soft);
		outline-offset: 2px;
	}

	@media (max-width: 720px) {
		.welcome {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.8rem;
		}

		.when {
			padding-bottom: 0;
			text-align: left;
		}
	}
</style>
