<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 2rem;
	}
</style>
