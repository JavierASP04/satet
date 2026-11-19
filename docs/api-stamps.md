# Timbres fiscales electrónicos (API)

Contrato del módulo 04 para integrar el frontend. La sesión es la cookie descrita en [`api-auth.md`](api-auth.md). La tasa EUR/VED es la vigente de [`api-bcv.md`](api-bcv.md). Los errores usan el mismo sobre:

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "El expediente debe estar aprobado para emitir timbres."
	}
}
```

El inicio de sesión no exige aprobación. Emitir un timbre sí: sin expediente aprobado no hay timbre. Al comprarlo queda `ACTIVO`, con PDF y QR firmado. El SAREN lo consume una vez. Tesorería puede anularlo si rechaza el pago y todavía está activo.

## Cálculo

El monto en euros es la cifra del tabulador: veces el tipo de cambio oficial. Bolívares = redondeo a 2 decimales de (esa cifra × tasa EUR vigente).

La tasa es la fila EUR guardada con mayor fecha que no sea posterior a hoy en Caracas. El servidor no vuelve a consultar al BCV en esta operación. Si no hay tasa, no emite.

Ejemplo: el artículo 31, numeral 8, vale `1.20`. Con tasa `41.2500` el timbre sale en `49.50` bolívares.

## Tabulador cargado

Son 196 conceptos de monto fijo. Cada compra es una unidad de la fila (un folio, un metro cuadrado, una hectárea o el acto, según el texto). El catálogo completo sale en `GET /api/v1/stamps/fees`.

El PDF no trae exenciones ni exoneraciones. No se cargó ninguna.

Estas líneas del PDF no tienen un múltiplo fijo del tipo de cambio, así que no se venden:

- Artículo 34, numerales 8 y 9: 1 % del costo o del valor de la obra.
- Artículo 35, numerales 5 y 6: 2 % del capital suscrito, del aumento o del capital.
- Artículo 36, numeral 3: almacenar plaguicidas de uso doméstico, sin cifra en el PDF.
- Artículo 37, numeral 9: dice que el permiso se renueva cada año y no indica el monto de esa renovación.
- No hay artículo 43 en el PDF.

Las renovaciones que el PDF fija como 50 % o 100 % de un tributo ya cifrado sí entraron: `44.16.renovacion` en `1.00`, `47.2.renovacion` en `5.00` y `48.1.renovacion` en `1.00`.

- `31.1` 1.00 — Expedición de constancias de domicilio
- `31.2.a` 1.00 — Copias certificadas destinadas a particulares, por la primera pieza o documento
- `31.2.a.folio` 0.20 — Copia certificada de planos o mapas oficiales, por cada folio
- `31.2.b` 1.00 — Cada documento o folio adicional suscrito por el funcionario competente
- `31.3` 1.00 — Copias certificadas de títulos, constancias, certificados, credenciales o permisos de organismos oficiales, distintas de las reguladas por otros artículos
- `31.4` 1.00 — Copias fotostáticas, manuscritas o mecanografiadas del Registro Mercantil, notarías, tribunales u otro registro público, conforme al arancel judicial
- `31.5` 1.00 — Información o cuadros estadísticos certificados para particulares, cualquiera sea el número de folios
- `31.6` 1.00 — Consultas a la Administración Tributaria sobre la aplicación de normas tributarias a una situación concreta
- `31.7` 1.00 — Legalización de firmas de funcionarios públicos o autoridades venezolanas en el estado Trujillo
- `31.8` 1.20 — Certificación de títulos o diplomas profesionales, académicos de educación o instrucción
- `31.9` 2.50 — Títulos otorgados por instituciones académicas venezolanas para obtener el doctorado
- `31.10` 2.00 — Títulos otorgados para obtener la maestría o especialización
- `31.11` 1.50 — Títulos otorgados para obtener la licenciatura
- `31.12` 1.20 — Títulos otorgados por universidades venezolanas distintos de los anteriores
- `31.13` 1.20 — Títulos del área profesional (técnico superior universitario)
- `31.14` 1.00 — Demás títulos con validez legal otorgados por organismos nacionales
- `31.15` 1.00 — Inscripción y otorgamiento de matrícula o registro a títulos de profesionales de la salud y afines
- `32.1` 1.50 — Evaluación y estudio sanitario sobre proyectos
- `32.2` 1.20 — Evaluación y estudio de elaboración de agua potable y aguas residuales
- `32.3` 1.20 — Análisis físico-químico básico y de metales
- `32.4` 1.20 — Análisis físico-químicos especiales
- `32.5` 1.20 — Análisis físico-químico sobre compuestos orgánicos especiales
- `32.6` 2.00 — Análisis microbiológicos
- `32.7` 2.00 — Análisis biológicos
- `32.8` 25.00 — Análisis químico o físico-químico de sustancias desnaturalizantes o materia prima para bebidas alcohólicas
- `32.9.a` 1.20 — Inspección y evaluación para laboratorios farmacéuticos
- `32.9.b` 1.20 — Inspección y evaluación de casa de representación de droguerías y distribuidoras
- `32.9.c` 1.20 — Inspección y evaluación de farmacias
- `32.9.d` 1.20 — Inspección y evaluación de expendios de medicinas
- `32.10` 1.20 — Inspección y evaluación del cumplimiento de normas técnicas de manufactura de la industria farmacéutica, cosméticos y productos naturales
- `32.11` 1.20 — Inspecciones de reconocimiento de productos terminados
- `32.12` 1.20 — Evaluación y estudio de proyectos de instalación, reforma o modificación de establecimientos de alimentos
- `32.13` 1.20 — Evaluación y estudio higiénico-sanitario de empresas
- `32.14` 1.20 — Otorgamiento y renovación de permisos para la compraventa de sustancias psicotrópicas y estupefacientes lícitas
- `32.15` 1.20 — Registro y sellado de libros para el control de sustancias estupefacientes y psicotrópicas
- `32.16` 1.20 — Certificado de libre venta y consumo de productos alimenticios
- `32.17` 1.20 — Constancia de registro sanitario de productos alimenticios
- `32.18` 1.20 — Certificación sanitaria de la calidad de alimentos
- `32.19` 1.20 — Permiso sanitario para importación de alimentos
- `32.20` 1.20 — Certificación de ingredientes para la elaboración de alimentos
- `32.21` 1.20 — Certificación sanitaria de materiales en contacto con alimentos
- `32.22` 1.20 — Certificación sanitaria de equipos y utensilios para el manejo de productos alimenticios
- `32.23` 2.00 — Permiso sanitario para el funcionamiento de industrias de alimentos
- `32.24` 2.00 — Permiso sanitario para el funcionamiento de expendio y almacenamiento de alimentos
- `32.25` 1.20 — Permiso sanitario para expendios ambulantes y transporte de alimentos
- `32.26` 1.20 — Constancia o informe técnico de operatividad y funcionamiento, distinto de los regulados en otros artículos
- `32.27` 1.20 — Autorización para prácticas sujetas al régimen de excepciones de la ley de antimonopolio
- `32.28` 1.20 — Autorización y registro sanitario de productos cosméticos
- `32.29` 1.20 — Asesoría técnico-científica y revisión de expedientes
- `32.30` 1.20 — Autorización para el registro de productos cosméticos
- `32.31` 1.20 — Inspección para instalación de establecimientos distribuidores de productos cosméticos
- `32.32` 1.20 — Cambio de fórmula cosmética (reformulación)
- `32.33` 1.20 — Otros conceptos cosméticos
- `32.34` 1.00 — Certificado de libre venta
- `32.35` 1.00 — Constancia de fórmula aprobada
- `32.36` 1.20 — Copia certificada de registro
- `32.37` 1.20 — Copia certificada de documentos
- `32.38` 1.00 — Cambio de fabricante
- `32.39` 1.20 — Cambio de propietario
- `32.40` 1.00 — Cambio de razón social
- `32.41` 1.20 — Cambio de establecimiento distribuidor
- `32.42` 1.20 — Cambio de patrocinante
- `32.43` 2.00 — Permiso de exportación de productos farmacéuticos, productos naturales y cosméticos
- `32.44` 2.00 — Permisos de importación
- `32.45` 1.20 — Publicación, autorización y renovación
- `32.46` 1.20 — Cambio de denominación comercial
- `32.47` 1.20 — Cambio o periodo de validez
- `32.48` 1.20 — Cambio por modificación de rótulos o empaques (post-registro)
- `32.49` 1.20 — Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental
- `32.50` 1.20 — Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos
- `33.1` 10.00 — Autorización de industrias productoras de alcohol y especies alcohólicas, o ampliación de las ya instaladas
- `33.1.renovacion` 10.00 — Renovación anual de la autorización de industrias productoras de alcohol y especies alcohólicas
- `33.2.urbana` 8.00 — Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas urbanas
- `33.2.suburbana` 6.00 — Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas suburbanas
- `33.2.renovacion` 6.00 — Renovación anual de las autorizaciones de expendios de bebidas alcohólicas
- `33.3` 2.00 — Autorización a personas naturales para operar como agentes de aduanas
- `33.4` 35.00 — Autorización a personas jurídicas para operar como agentes de aduanas
- `33.5` 10.00 — Autorización para operar bajo el régimen de puerto libre
- `33.6` 10.00 — Autorización para operar como almacenes generales de depósito, depósitos temporales, depósitos aduaneros y almacenes de impuesto
- `34.1` 10.00 — Registro de proyectos para el establecimiento de nuevas industrias o la ampliación de las ya instaladas
- `34.2` 6.00 — Certificados o informes periciales técnicos sobre la calidad de bienes y servicios
- `34.3` 4.00 — Certificación de lotes o partidas de productos, materiales, partes y componentes
- `34.4` 4.00 — Certificación de calidad de productos o servicios
- `34.5` 6.00 — Evaluación del control de calidad
- `34.6` 6.00 — Análisis químico o físico-químico de productos y mercancías para su clasificación arancelaria
- `34.7` 5.00 — Aprobación para la colocación de vallas publicitarias en los laterales de la vialidad, fuera del derecho de vía
- `34.10` 1.00 — Solicitud de licencias para expender timbres fiscales
- `34.11` 1.00 — Otorgamiento o renovación de licencia para expendio de timbres fiscales
- `34.parrafo` 2.00 — Constancias, solicitudes u otros actos emitidos por entes, empresas e instituciones adscritos a la Gobernación del estado Trujillo
- `35.1` 8.00 — Certificados de registro de marcas, lemas, denominaciones comerciales, patentes, modelos, dibujos industriales e introducción de invento o mejora
- `35.2` 12.00 — Nombres y denominaciones de empresas mercantiles y firmas comerciales ante el Registro Mercantil
- `35.3` 23.00 — Registro de documentos constitutivos de sociedades de comercio e inscripción de modificaciones al documento constitutivo y a los estatutos
- `35.4` 25.00 — Registro de sociedades extranjeras, domiciliaciones, agencias, sucursales o representaciones, y sus actuaciones sucesivas
- `35.4.folio` 0.20 — Registro de sociedades extranjeras, por cada folio de inscripción
- `35.7` 12.00 — Registro de sociedades accidentales y consorcios en el Registro Mercantil
- `35.8.hasta50` 12.00 — Registro de la venta de un fondo de comercio, del 1 % al 50 %
- `35.8.desde51` 23.00 — Registro de la venta de un fondo de comercio, del 51 % al 100 %
- `35.9.a` 3.00 — Poder de comerciante a factores y dependientes, si el poderdante es persona jurídica
- `35.9.b` 1.50 — Poder de comerciante a factores y dependientes, si el poderdante es persona natural
- `35.10.a` 3.00 — Cualquier otro poder, si el poderdante es persona jurídica
- `35.10.b` 1.50 — Cualquier otro poder, si el poderdante es persona natural
- `35.11` 1.00 — Cualquier solicitud dirigida a las notarías públicas, sin perjuicio de los demás tributos
- `35.12` 5.00 — Inscripción de cualquier otro documento en los registros de comercio, distinto de los regulados por otros artículos
- `35.12.b` 1.00 — Inscripción en los registros de comercio, por cada folio adicional
- `36.1` 1.50 — Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico
- `36.2` 1.50 — Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico
- `36.4` 1.50 — Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico
- `36.5` 1.50 — Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico
- `36.6` 1.50 — Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico
- `36.7` 1.20 — Registro de interesado para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso doméstico
- `36.8` 1.20 — Registro de interesado para la aplicación de plaguicidas de uso doméstico
- `36.9` 1.50 — Permiso para fumigaciones aéreas con plaguicidas de uso doméstico en zonas residenciales
- `37.1` 0.10 — Habitabilidad de vivienda, por metro cuadrado
- `37.2` 0.40 — Habitabilidad de comercio, por metro cuadrado
- `37.3` 0.40 — Habitabilidad industrial, por metro cuadrado
- `37.4` 0.10 — Conformidad sanitaria de aptitud de condominio, por metro cuadrado
- `37.5` 1.50 — Conformación sanitaria para cambio de uso del local
- `37.6` 2.00 — Conformación sanitaria para desarrollos urbanísticos
- `37.7` 1.00 — Conformación sanitaria de integración, parcelamiento y cambio de uso de parcela, por metro cuadrado
- `37.8` 0.40 — Conformación sanitaria de proyectos de tratamiento de aguas blancas y residuales, por metro cúbico
- `37.9` 2.00 — Conformación sanitaria de instalación y funcionamiento de industrias
- `38.1` 1.70 — Registro para la fabricación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal
- `38.2` 1.70 — Registro para distribución, expendio, publicidad, almacenamiento y transporte de plaguicidas agrícolas o pecuarios, fertilizantes, abonos y productos de uso animal
- `38.3` 1.70 — Registro para la aplicación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal
- `38.4` 1.70 — Registro de productos biológicos, medicamentos y alimentos para uso animal
- `38.5` 1.70 — Autorización para la fabricación de plaguicidas de uso agrícola, fertilizantes y abonos
- `38.6` 1.70 — Autorización para expendio, aplicación comercial, depósito, publicidad, formulación y envasado de plaguicidas de uso agrícola
- `38.7` 1.70 — Certificado de libre venta de plaguicidas de uso agrícola, fertilizantes, abonos biológicos y productos de uso animal
- `39.1` 10.00 — Permiso para el funcionamiento de pool y billar
- `39.2` 5.00 — Renovación de permisos de pool y billar
- `39.3` 10.00 — Permiso para el funcionamiento de parley o sport book
- `39.4` 5.00 — Renovación de permisos de parley o sport book
- `39.5.a` 3.00 — Permiso para el funcionamiento de bingos y casinos
- `39.5.b` 3.00 — Cada inscripción en el libro de bingos y casinos
- `39.5.c` 3.00 — Inscripción en el registro de organizaciones de juegos y apuestas lícitas
- `39.5.d` 3.00 — Permiso para la organización eventual de juegos y apuestas lícitas
- `39.6` 3.00 — Identificación de cada máquina o aparato de juegos
- `40.1` 1.50 — Permiso de dotación de agua para uso doméstico
- `40.2` 1.50 — Permiso de dotación de agua para uso sanitario industrial
- `40.3` 1.50 — Permiso de perforación de pozos profundos
- `40.4` 1.50 — Permiso de perforación de sistemas de tratamiento de aguas blancas y servidas
- `40.5` 1.50 — Permiso de operación para empresa de limpieza y desinfección de estanques de agua potable
- `40.6` 1.50 — Permiso para transporte de agua en camión cisterna
- `41.1` 1.50 — Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial
- `41.2` 1.50 — Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial
- `41.3` 1.50 — Autorización para almacenar plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial
- `41.4` 1.50 — Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario, industrial o agropecuario
- `41.5` 1.50 — Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial
- `41.6` 1.50 — Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial
- `41.7` 1.20 — Registro para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso sanitario o industrial
- `41.8` 1.20 — Registro para la aplicación de plaguicidas de uso sanitario o industrial
- `41.9` 1.50 — Permiso para fumigaciones aéreas con plaguicidas de uso sanitario o industrial
- `41.10` 1.20 — Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental
- `41.11` 1.20 — Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos
- `42.1` 2.00 — Constancia de registro de hierros
- `42.2` 2.00 — Constancia de registro de señal
- `44.1.a` 0.40 — Servicios técnicos forestales de madera en rolas y escuadrada importada, por metro cúbico
- `44.1.b` 0.40 — Servicios técnicos forestales de madera aserrada importada, por metro cúbico
- `44.2.a` 1.00 — Estantes, estantillos, viguetas, barras, listones de mangle y otras especies importados, por unidad
- `44.2.b` 1.00 — Cogollos de palmitos importados, por unidad
- `44.3` 1.00 — Fibras de palma de chiquichiqui, por kilogramo
- `44.4` 1.00 — Horcones, vigas, viguetones, tirantes, soleras, costillas, madrinas, puntales y esquineros, por unidad
- `44.5` 1.00 — Postes
- `44.6` 1.00 — Leñas
- `44.7` 1.00 — Carbón vegetal, por tonelada
- `44.8` 1.00 — Permiso o autorización de deforestación y roza que no origine aprovechamiento forestal, por hectárea autorizada
- `44.9` 1.00 — Certificación de ubicación en áreas bajo régimen de administración especial, por una hectárea
- `44.9.adicional` 0.20 — Certificación de ubicación en áreas bajo régimen de administración especial, por hectárea o fracción adicional
- `44.10` 1.00 — Autorización para la afectación de recursos naturales
- `44.11` 1.00 — Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por una hectárea
- `44.11.adicional` 0.50 — Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por hectárea o fracción adicional
- `44.12` 1.00 — Afectación de recursos naturales para actividades industriales
- `44.12.adicional` 0.50 — Afectación de recursos naturales para actividades industriales, por hectárea o fracción adicional
- `44.13.a` 5.00 — Licencia o permiso de exploración, extracción y aprovechamiento de minerales no metálicos, hasta por una hectárea
- `44.13.a.adicional` 0.40 — Licencia o permiso de minerales no metálicos, por cada hectárea adicional
- `44.13.b` 1.00 — Declaratoria de impacto ambiental
- `44.14.a` 1.00 — Evaluación y estudio de laboratorio de suelos: análisis de rutina
- `44.14.b` 1.00 — Evaluación y estudio de laboratorio de suelos: análisis de calicata
- `44.14.c` 1.00 — Evaluación y estudio de laboratorio de suelos: análisis de salinidad
- `44.14.d` 1.00 — Evaluación y estudio de laboratorio de suelos: análisis de física de suelos
- `44.14.e` 1.00 — Evaluación y estudio de laboratorio de suelos: análisis de fertilidad
- `44.14.f` 1.00 — Evaluación y estudio de análisis integrado de suelos y aguas
- `44.15` 2.00 — Autorización de funcionamiento a personas que realicen actividades susceptibles de degradar el ambiente
- `44.16` 2.00 — Estudio, análisis y evaluación para el registro de actividades susceptibles de degradar el ambiente
- `44.16.renovacion` 1.00 — Renovación anual de la autorización de funcionamiento del numeral 15: 50 % del monto establecido
- `44.17` 2.00 — Estudio, análisis y evaluación permanente de actividades que generen contaminación sónica
- `45.1` 2.00 — Actos, documentos u otorgamientos no previstos en el instrumento, emitidos en el estado Trujillo
- `47.1` 1.00 — Legalización de firmas de funcionarios de órganos o entes adscritos al Ejecutivo del estado Trujillo
- `47.2` 10.00 — Inscripción de empresas o firmas personales en el Registro de Contratistas, proveedores y prestadores de servicios
- `47.2.renovacion` 5.00 — Renovación anual de la inscripción en el Registro de Contratistas: 50 % del tributo
- `47.3` 10.00 — Manifestación de voluntad para participar en procesos de contratación pública del estado Trujillo
- `47.4` 25.00 — Solicitud de adquisición de guías de circulación de materiales no metálicos por mineros autorizados o registrados
- `48.1` 1.00 — Autorización a personas naturales o jurídicas para el expendio de timbres fiscales
- `48.1.renovacion` 1.00 — Renovación anual de la autorización para el expendio de timbres fiscales: 100 % del tributo
- `48.2` 0.50 — Solicitud de adquisición de timbres fiscales por expendedores o distribuidores mayoristas autorizados
- `48.3` 0.50 — Solicitud de habilitación de libros ante el órgano de Administración Tributaria del estado Trujillo

## `GET /api/v1/stamps/fees`

Misma sesión y permiso `timbres:comprar`. No exige expediente aprobado.

`200`: `{ "fees": [ { "code": "31.8", "article": "31", "item": "8", "concept": "Certificación de títulos o diplomas profesionales, académicos de educación o instrucción", "timesOfficialRate": "1.20" } ] }`.

## `POST /api/v1/stamps/purchase`

Sesión vigente, permiso `timbres:comprar` y expediente aprobado.

`CONTRIBUYENTE` y `ADMIN_SISTEMA` tienen ese permiso. Recaudación, tesorería y SAREN reciben `403`. El administrador solo emite si su cuenta tiene un expediente aprobado; si no lo tiene, la respuesta es `404`.

Cuerpo:

```json
{ "feeCode": "31.8" }
```

`feeCode` es el código de una fila cargada. Un monto libre responde `400`. Un código que no está en el tabulador responde `404`.

`201`:

```json
{
	"stamp": {
		"id": "6b1e0c3a-1d2f-4a55-9c10-11aa22bb33cc",
		"uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
		"rif": "J-12345678-9",
		"taxpayer": "Constructora Trujillo C.A.",
		"feeCode": "31.8",
		"concept": "Certificación de títulos o diplomas profesionales, académicos de educación o instrucción",
		"amountEur": "1.20",
		"bcvRate": "41.2500",
		"amountVed": "49.50",
		"issuedAt": "2026-10-23T14:30:00.000Z",
		"status": "ACTIVO",
		"qrPayload": "{\"uuid\":\"f81d4fae-7dec-11d0-a765-00a0c91e6bf6\",\"rif\":\"J-12345678-9\",\"taxpayer\":\"Constructora Trujillo C.A.\",\"amount_eur\":1.2,\"bcv_rate\":41.25,\"amount_ved\":49.5,\"issued_at\":\"2026-10-23T14:30:00.000Z\",\"sig\":\"…\"}"
	}
}
```

`uuid` es el serial del timbre (UUID v4). `id` es la fila interna. `amountEur` y `amountVed` traen dos decimales; `bcvRate`, cuatro. Son strings. Dentro del QR los montos van como números JSON.

Cada compra crea un timbre nuevo. No reemplaza los anteriores.

## `GET /api/v1/stamps/:uuid/pdf`

Misma sesión y el mismo permiso. `200` con `Content-Type: application/pdf` y `Content-Disposition: attachment`. El archivo se llama `timbre-<uuid>.pdf`.

El PDF trae el serial, el contribuyente, el RIF, el concepto, los euros, la tasa, los bolívares, la fecha y el estado, más el código QR de `qrPayload`.

Lo descarga el dueño del timbre. El administrador puede descargar cualquiera. Para el resto, un serial ajeno o inexistente responde `404` con el mismo mensaje, para no revelar si el timbre existe.

## Código QR

El texto del QR es un JSON con las claves de la especificación y una firma `sig`:

| Clave        | Contenido                                     |
| ------------ | --------------------------------------------- |
| `uuid`       | Serial                                        |
| `rif`        | RIF del contribuyente                         |
| `taxpayer`   | Razón social, tal como está en el expediente  |
| `amount_eur` | Euros                                         |
| `bcv_rate`   | Tasa aplicada                                 |
| `amount_ved` | Bolívares                                     |
| `issued_at`  | Fecha de emisión en UTC (`issuedAt` del JSON) |
| `sig`        | HMAC-SHA256 en base64url                      |

La firma cubre el JSON de esos campos, sin `sig`, con las claves en el orden de la tabla. El secreto es `JWT_SECRET` del servidor. El navegador no firma ni verifica: muestra el serial y descarga el PDF. Una verificación que cambie un monto, el RIF o el serial tiene que fallar.

El consumo en notaría, una sola vez, está en [`api-saren.md`](api-saren.md). Este módulo no cambia el estado a `CONSUMIDO`.

## Errores

| HTTP | `code`             | Cuándo                                                                                                             |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR` | Falta el código del concepto                                                                                       |
| 401  | `UNAUTHORIZED`     | Sin cookie, token inválido o usuario inactivo                                                                      |
| 403  | `FORBIDDEN`        | Sin permiso, o el expediente todavía no está aprobado                                                              |
| 404  | `NOT_FOUND`        | El concepto no está en el tabulador, no hay expediente, no hay tasa vigente, o el PDF no corresponde a esta sesión |
