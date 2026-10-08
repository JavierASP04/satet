<script>
	import Card from '#lib/components/Card.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import { visibleNavigation } from '#lib/navigation.js';

	let { data } = $props();
	const groups = $derived(visibleNavigation(data.user.role));
</script>

<Screen module="07" title="Panel" description="Accesos disponibles para tu rol." ready>
	<div class="cards">
		{#each groups as group (group.label)}
			<Card kicker="Módulo {group.module}" title={group.label}>
				<ul>
					{#each group.items as item (item.href)}
						<li><a href={item.href}>{item.label}</a></li>
					{/each}
				</ul>
			</Card>
		{/each}
	</div>
</Screen>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.85rem;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		font-weight: 650;
		text-decoration: none;
	}
</style>
