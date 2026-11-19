<script>
	import { onDestroy, tick, untrack } from 'svelte';
	import { STAMP_VERIFICATION_CODES } from '@satet/shared';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Form from '#lib/components/Form.svelte';
	import Screen from '#lib/components/Screen.svelte';
	import TextAreaField from '#lib/components/TextAreaField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import { formatEur, formatRate, formatRegisteredAt, formatVed } from '#lib/bcv.js';
	import { stampStatusLabel } from '#lib/stamps.js';

	let { form } = $props();

	let uuid = $state(untrack(() => form?.values?.uuid || ''));
	let office = $state(untrack(() => form?.values?.officeName || ''));
	let qrPayload = $state('');
	let scanning = $state(false);
	let scanError = $state('');
	let submitting = $state(false);
	/** @type {HTMLVideoElement | null} */
	let video = $state(null);

	/** @type {MediaStream | null} */
	let stream = null;
	let timer = 0;

	const headlines = {
		[STAMP_VERIFICATION_CODES.VALIDATED_AND_CONSUMED]: 'Consumido',
		[STAMP_VERIFICATION_CODES.ALREADY_USED]: 'Ya usado',
		[STAMP_VERIFICATION_CODES.ANNULLED]: 'Anulado',
		[STAMP_VERIFICATION_CODES.NOT_FOUND]: 'No existe'
	};

	/** @param {string} text */
	function serialFromQr(text) {
		const raw = String(text ?? '').trim();
		try {
			const data = JSON.parse(raw);
			if (data && typeof data.uuid === 'string' && data.uuid.trim()) return data.uuid.trim();
		} catch {
			// El código puede ser el serial en texto plano.
		}
		const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
		return match ? match[0] : '';
	}

	/** @param {Event & { currentTarget: HTMLTextAreaElement }} event */
	function onQr(event) {
		qrPayload = event.currentTarget.value;
		const serial = serialFromQr(qrPayload);
		if (serial) uuid = serial;
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
				qrPayload = value.trim();
				uuid = serialFromQr(qrPayload);
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
	description="El serial o el QR firmado se valida y el timbre se consume una sola vez."
	ready
>
	<div class="stack">
		{#if form?.message && !form?.code}
			<Alert tone="danger">{form.message}</Alert>
		{/if}

		<section class="sheet">
			<Form
				method="POST"
				submit={() => {
					submitting = true;
					return async ({ result, update }) => {
						await update({ reset: false });
						submitting = false;
						const values = result.type === 'success' || result.type === 'failure' ? result.data?.values : null;
						if (values) {
							uuid = values.uuid || '';
							office = values.officeName || '';
						}
					};
				}}
			>
				<div class="editor">
					<div class="scan">
						<Button type="button" variant="ghost" onclick={startScan}>Escanear QR</Button>
						{#if qrPayload}
							<p class="read">QR firmado listo. Se envía el código completo, no solo el serial.</p>
						{/if}
					</div>
					{#if scanError}
						<p class="warn">{scanError}</p>
					{/if}
					<TextAreaField
						label="Contenido del QR"
						name="qrPayload"
						maxlength="4000"
						rows="4"
						placeholder="Pega aquí el JSON firmado del código, o escanéalo"
						value={qrPayload}
						oninput={onQr}
					/>
					<TextField
						label="Serial del timbre"
						name="uuid"
						maxlength="36"
						placeholder="Escribe el serial o escanéalo"
						value={uuid}
						oninput={(event) => {
							uuid = event.currentTarget.value;
							qrPayload = '';
						}}
					/>
					<TextField
						label="Oficina SAREN"
						name="officeName"
						required
						minlength="2"
						maxlength="255"
						placeholder="Registro Principal de Trujillo"
						value={office}
						oninput={(event) => (office = event.currentTarget.value)}
					/>
					<div class="actions">
						<Button disabled={submitting}>{submitting ? 'Verificando…' : 'Verificar y consumir'}</Button>
						<Button href="/saren/historial" variant="ghost">Historial</Button>
					</div>
				</div>
			</Form>
			<aside class="slip">
				<p class="kicker">Resultado</p>
				{#if form?.code}
					<p class="total">{headlines[form.code] ?? 'Resultado'}</p>
					<p class="formula">{form.message}</p>
				{:else}
					<p class="total">Sin consulta</p>
					<p class="formula">
						Un timbre activo pasa a consumido. Si ya se usó o está anulado, la oficina ve la alerta y el timbre no cambia.
					</p>
				{/if}
			</aside>
		</section>

		{#if form?.stamp}
			<section class="facts">
				<div>
					<p>Contribuyente</p>
					<strong>{form.stamp.taxpayer || '—'}</strong>
					<span>{form.stamp.rif || '—'}</span>
				</div>
				<div>
					<p>Serial</p>
					<strong class="serial">{form.stamp.uuid}</strong>
				</div>
				<div>
					<p>Monto</p>
					<strong>{formatEur(form.stamp.amountEur)}</strong>
					<span>{formatVed(Number(form.stamp.amountVed))} · tasa {formatRate(form.stamp.bcvRate)}</span>
				</div>
				<div>
					<p>Emitido</p>
					<strong>{formatRegisteredAt(form.stamp.issuedAt)}</strong>
					<span>Consumido {formatRegisteredAt(form.stamp.consumedAt)}</span>
				</div>
				<div>
					<p>Oficina</p>
					<strong>{form.stamp.officeName || '—'}</strong>
					<span>{stampStatusLabel(form.stamp.status)}</span>
				</div>
			</section>
		{/if}
	</div>
</Screen>

{#if scanning}
	<div class="backdrop">
		<button type="button" class="scrim" aria-label="Cerrar cámara" onclick={stopScan}></button>
		<div
			class="modal"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Escanear QR del timbre"
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
		grid-template-columns: minmax(0, 1.25fr) minmax(16rem, 0.75fr);
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 1.5rem;
		background: var(--surface);
		box-shadow: 0 12px 32px rgb(15 46 34 / 0.06);
	}

	.editor {
		display: grid;
		gap: 0.85rem;
		padding: 1.25rem;
	}

	.scan,
	.actions {
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

	.facts {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.facts div {
		display: grid;
		gap: 0.2rem;
		padding: 1rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: 1.15rem;
		background: var(--surface);
	}

	.facts p,
	.facts span {
		margin: 0;
		color: var(--muted);
		font-size: 0.78rem;
	}

	.facts p {
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.facts strong {
		font-size: 1.05rem;
		overflow-wrap: anywhere;
	}

	.serial {
		font-size: 0.92rem;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgb(26 20 18 / 0.62);
		cursor: pointer;
	}

	.modal {
		position: relative;
		z-index: 1;
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

	@media (max-width: 980px) {
		.facts {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 860px) {
		.sheet,
		.facts {
			grid-template-columns: 1fr;
		}
	}
</style>
