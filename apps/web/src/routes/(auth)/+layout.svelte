<script>
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	const pages = new Set(['/login', '/registro']);

	onNavigate((navigation) => {
		const from = navigation.from?.url.pathname ?? '';
		const to = navigation.to?.url.pathname ?? '';
		if (!pages.has(from) || !pages.has(to)) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (!document.startViewTransition) return;

		document.documentElement.dataset.authDir = to === '/registro' ? 'forward' : 'back';

		return new Promise((resolve) => {
			try {
				document.startViewTransition(async () => {
					resolve();
					await navigation.complete;
				});
			} catch {
				resolve();
			}
		});
	});
</script>

{@render children()}
