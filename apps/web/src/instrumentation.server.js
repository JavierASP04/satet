// adapter-node corta el formulario en 512 KB si esta variable no existe.
// Una foto de comprobante cabe en 2 MB; 6M deja pasar el multipart y el tope
// de negocio sigue siendo el de readVoucherField.
if (!process.env.BODY_SIZE_LIMIT) {
	process.env.BODY_SIZE_LIMIT = '6M';
}
