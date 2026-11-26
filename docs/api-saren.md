# SAREN

El módulo SAREN se retiró. No hay rol `VERIFICADOR_SAREN`, ni menú, ni `POST /api/v1/saren/verify-stamp`, ni historial de oficina.

El QR del timbre abre `GET /api/v1/stamps/public/:uuid`, sin sesión. Esa vista dice si está pendiente, válido, consumido, anulado o rechazado. El contrato está en [`api-requerimientos.md`](api-requerimientos.md).
