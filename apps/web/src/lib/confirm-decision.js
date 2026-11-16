/** @type {((form: HTMLFormElement, submitter: HTMLElement | null) => void) | null} */
let openConfirm = null;

/**
 * @param {(form: HTMLFormElement, submitter: HTMLElement | null) => void} opener
 */
export function registerConfirm(opener) {
	openConfirm = opener;
	return () => {
		if (openConfirm === opener) openConfirm = null;
	};
}

/**
 * Intercepta el envío y abre el aviso propio antes de guardar.
 * @param {HTMLFormElement} form
 */
export function confirmSubmit(form) {
	/** @param {SubmitEvent} event */
	function onSubmit(event) {
		if (form.dataset.confirmed === '1') {
			delete form.dataset.confirmed;
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
		openConfirm?.(form, submitter);
	}

	form.addEventListener('submit', onSubmit, true);
	return {
		destroy() {
			form.removeEventListener('submit', onSubmit, true);
		}
	};
}
