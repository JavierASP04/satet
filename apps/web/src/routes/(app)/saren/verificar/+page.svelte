<script>
	import { onDestroy, tick } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import StaticNotice from '#lib/components/StaticNotice.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let uuid = $state('');
	let office = $state('');
	let shown = $state(false);
	let scanning = $state(false);
	let scanError = $state('');
	let scanned = $state(false);
	/** @type {HTMLVideoElement | null} */
	let video = $state(null);

	/** @type {MediaStream | null} */
	let stream = null;
	let timer = 0;

	const serial = $derived(uuid.trim() || 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6');

	/** El QR del timbre lleva un JSON con `uuid`, o el serial solo. */
	function serialFromQr(text) {
		const raw = String(text ?? '').trim();
		try {
			const data = JSON.parse(raw);
			if (data && typeof data.uuid === 'string' && data.uuid.trim()) return data.uuid.trim();
		} catch {
			// El código puede ser el serial en texto plano.
		}
		const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
		return match ? match[0] : raw.slice(0, 36);
	}

	function stopScan() {
		if (typeof window === 'undefined') return;
		window.clearInterval(timer);
		timer = 0;
		if (stream) {
			for (const track of stream.getTracks()) track.stop();
			stream = null;
		}
		if (video) video.srcObject = null;
		scanning = false;
	}

	async function startScan() {
		scanError = '';
		scanned = false;
		if (!navigator.mediaDevices?.getUserMedia) {
			scanError = 'Este navegador no puede usar la cámara. Escribe el serial.';
			return;
		}
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});
		} catch {
			scanError = 'No se pudo abrir la cámara. Revisa el permiso del navegador.';
			stopScan();
			return;
		}
		scanning = true;
		await tick();
		if (!video) {
			stopScan();
			scanError = 'No se pudo mostrar la cámara.';
			return;
		}
		video.srcObject = stream;
		try {
			await video.play();
		} catch {
			stopScan();
			scanError = 'No se pudo iniciar la cámara.';
			return;
		}
		const native = 'BarcodeDetector' in window ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
		const { default: jsQR } = native ? { default: null } : await import('jsqr');
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d', { willReadFrequently: true });
		timer = window.setInterval(async () => {
			if (!video || video.readyState < 2) return;
			try {
				let value = '';
				if (native) {
					const codes = await native.detect(video);
					value = codes[0]?.rawValue ?? '';
				} else if (context && jsQR && video.videoWidth > 0) {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					context.drawImage(video, 0, 0);
					const frame = context.getImageData(0, 0, canvas.width, canvas.height);
					value = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? '';
				}
				if (!value) return;
				uuid = serialFromQr(value);
				shown = false;
				scanned = true;
				stopScan();
			} catch {
				// Un frame ilegible no corta la lectura.
			}
		}, 280);
	}

	onDestroy(stopScan);
</script>

<Screen
	module="06"
	title="Verificar timbre"
	description="El serial o el QR se valida y el timbre se consume una sola vez."
	ready
>
	<div class="stack">
		<StaticNotice />
		<section class="sheet">
			<form
				onsubmit={(event) => {
					event.preventDefault();
					shown = true;
				}}
			>
				<div class="editor">
					<div class="scan">
						<Button type="button" variant="ghost" onclick={startScan}>Escanear QR</Button>
						{#if scanned}
							<p class="read">Serial leído del QR.</p>
						{/if}
					</div>
					{#if scanError}
						<p class="warn">{scanError}</p>
					{/if}
					<TextField
						label="Serial del timbre"
						name="uuid"
						maxlength="36"
						placeholder="f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
						value={uuid}
						oninput={(event) => {
							uuid = event.currentTarget.value;
							scanned = false;
						}}
					/>
					<TextField
						label="Oficina SAREN"
						name="office"
						maxlength="255"
						placeholder="Registro Inmobiliario de Valera"
						value={office}
						oninput={(event) => (office = event.currentTarget.value)}
					/>
					<div class="actions">
						<Button>Verificar y consumir</Button>
					</div>
				</div>
			</form>
			<aside class="slip">
				<p class="kicker">Resultado de muestra</p>
				{#if shown}
					<p class="total">Válido</p>
					<p class="formula">
						El serial {serial} quedaría consumido
						{#if office.trim()}en {office.trim()}{/if}. No se marcó en el servicio.
					</p>
				{:else}
					<p class="total">Sin consulta</p>
					<p class="formula">
						Un timbre activo pasa a consumido. Si ya se usó o está anulado, la oficina ve la alerta y no se vuelve a aceptar.
					</p>
				{/if}
			</aside>
		</section>
		<section class="cases">
			<article>
				<p>No existe</p>
				<strong>Serial desconocido</strong>
			</article>
			<article>
				<p>Ya consumido</p>
				<strong>Alerta de reutilización</strong>
			</article>
			<article>
				<p>Anulado</p>
				<strong>Timbre anulado</strong>
			</article>
		</section>
	</div>
</Screen>

{#if scanning}
	<div class="backdrop" role="presentation" onclick={stopScan}>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-label="Escanear QR del timbre"
			onclick={(event) => event.stopPropagation()}
		>
			<p class="modal-title">Apunta al código</p>
			<div class="frame">
				<video bind:this={video} muted playsinline></video>
				<span class="reticle" aria-hidden="true"></span>
			</div>
			<Button type="button" variant="ghost" onclick={stopScan}>Cerrar cámara</Button>
		</div>
	</div>
{/if}

<svelte:window
	onkeydown={(event) => {
		if (scanning && event.key === 'Escape') stopScan();
	}}
/>

<style>
	.stack {
		display: grid;
		gap: 0.85rem;
	}

	.sheet {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(16rem, 0.8fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(58 16 24 / 0.06);
	}

	.editor {
		display: grid;
		gap: 0.85rem;
		padding: 1.25rem;
	}

	.scan {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		align-items: center;
	}

	.read,
	.warn {
		margin: 0;
		font-size: 0.92rem;
	}

	.read {
		color: var(--ok);
		font-weight: 650;
	}

	.warn {
		color: var(--warning);
		font-weight: 650;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgb(26 20 18 / 0.62);
	}

	.modal {
		display: grid;
		gap: 0.9rem;
		width: min(100%, 22rem);
		padding: 1.05rem;
		border-radius: 1.4rem;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	.modal-title {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.frame {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 1rem;
		background: var(--wine-deep);
	}

	.frame video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.reticle {
		position: absolute;
		inset: 16%;
		border: 2px solid #fff;
		border-radius: 0.75rem;
		box-shadow: 0 0 0 999px rgb(26 20 18 / 0.42);
	}

	.actions {
		display: flex;
	}

	.slip {
		display: grid;
		align-content: end;
		gap: 0.4rem;
		padding: 1.35rem 1.25rem;
		background:
			radial-gradient(380px 160px at 100% 0%, rgb(255 255 255 / 0.08), transparent 62%),
			var(--wine-deep);
		color: #fff;
	}

	.kicker,
	.formula {
		margin: 0;
		color: var(--sidebar-muted);
	}

	.kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.total {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(1.8rem, 3vw, 2.5rem);
		font-weight: 650;
		letter-spacing: -0.04em;
		line-height: 1;
	}

	.cases {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.cases article {
		padding: 1rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: 1.15rem;
		background: var(--surface);
	}

	.cases p {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.cases strong {
		display: block;
		margin-top: 0.35rem;
		font-size: 1.05rem;
	}

	@media (max-width: 860px) {
		.sheet,
		.cases {
			grid-template-columns: 1fr;
		}
	}
</style>
