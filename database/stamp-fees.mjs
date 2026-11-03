/**
 * Tabulador de timbres fiscales (PDF legal). Cada monto es veces el tipo de cambio oficial.
 * No incluye porcentajes sobre una base externa ni el numeral sin cifra.
 * @type {{ code: string, article: string, item: string, concept: string, times: string }[]}
 */
export const STAMP_FEES = [
	['31.1', '31', '1', 'Expedición de constancias de domicilio', '1.00'],
	[
		'31.2.a',
		'31',
		'2.a',
		'Copias certificadas destinadas a particulares, por la primera pieza o documento',
		'1.00'
	],
	[
		'31.2.a.folio',
		'31',
		'2.a',
		'Copia certificada de planos o mapas oficiales, por cada folio',
		'0.20'
	],
	[
		'31.2.b',
		'31',
		'2.b',
		'Cada documento o folio adicional suscrito por el funcionario competente',
		'1.00'
	],
	[
		'31.3',
		'31',
		'3',
		'Copias certificadas de títulos, constancias, certificados, credenciales o permisos de organismos oficiales, distintas de las reguladas por otros artículos',
		'1.00'
	],
	[
		'31.4',
		'31',
		'4',
		'Copias fotostáticas, manuscritas o mecanografiadas del Registro Mercantil, notarías, tribunales u otro registro público, conforme al arancel judicial',
		'1.00'
	],
	[
		'31.5',
		'31',
		'5',
		'Información o cuadros estadísticos certificados para particulares, cualquiera sea el número de folios',
		'1.00'
	],
	[
		'31.6',
		'31',
		'6',
		'Consultas a la Administración Tributaria sobre la aplicación de normas tributarias a una situación concreta',
		'1.00'
	],
	[
		'31.7',
		'31',
		'7',
		'Legalización de firmas de funcionarios públicos o autoridades venezolanas en el estado Trujillo',
		'1.00'
	],
	[
		'31.8',
		'31',
		'8',
		'Certificación de títulos o diplomas profesionales, académicos de educación o instrucción',
		'1.20'
	],
	[
		'31.9',
		'31',
		'9',
		'Títulos otorgados por instituciones académicas venezolanas para obtener el doctorado',
		'2.50'
	],
	['31.10', '31', '10', 'Títulos otorgados para obtener la maestría o especialización', '2.00'],
	['31.11', '31', '11', 'Títulos otorgados para obtener la licenciatura', '1.50'],
	[
		'31.12',
		'31',
		'12',
		'Títulos otorgados por universidades venezolanas distintos de los anteriores',
		'1.20'
	],
	['31.13', '31', '13', 'Títulos del área profesional (técnico superior universitario)', '1.20'],
	[
		'31.14',
		'31',
		'14',
		'Demás títulos con validez legal otorgados por organismos nacionales',
		'1.00'
	],
	[
		'31.15',
		'31',
		'15',
		'Inscripción y otorgamiento de matrícula o registro a títulos de profesionales de la salud y afines',
		'1.00'
	],
	['32.1', '32', '1', 'Evaluación y estudio sanitario sobre proyectos', '1.50'],
	[
		'32.2',
		'32',
		'2',
		'Evaluación y estudio de elaboración de agua potable y aguas residuales',
		'1.20'
	],
	['32.3', '32', '3', 'Análisis físico-químico básico y de metales', '1.20'],
	['32.4', '32', '4', 'Análisis físico-químicos especiales', '1.20'],
	['32.5', '32', '5', 'Análisis físico-químico sobre compuestos orgánicos especiales', '1.20'],
	['32.6', '32', '6', 'Análisis microbiológicos', '2.00'],
	['32.7', '32', '7', 'Análisis biológicos', '2.00'],
	[
		'32.8',
		'32',
		'8',
		'Análisis químico o físico-químico de sustancias desnaturalizantes o materia prima para bebidas alcohólicas',
		'25.00'
	],
	['32.9.a', '32', '9.a', 'Inspección y evaluación para laboratorios farmacéuticos', '1.20'],
	[
		'32.9.b',
		'32',
		'9.b',
		'Inspección y evaluación de casa de representación de droguerías y distribuidoras',
		'1.20'
	],
	['32.9.c', '32', '9.c', 'Inspección y evaluación de farmacias', '1.20'],
	['32.9.d', '32', '9.d', 'Inspección y evaluación de expendios de medicinas', '1.20'],
	[
		'32.10',
		'32',
		'10',
		'Inspección y evaluación del cumplimiento de normas técnicas de manufactura de la industria farmacéutica, cosméticos y productos naturales',
		'1.20'
	],
	['32.11', '32', '11', 'Inspecciones de reconocimiento de productos terminados', '1.20'],
	[
		'32.12',
		'32',
		'12',
		'Evaluación y estudio de proyectos de instalación, reforma o modificación de establecimientos de alimentos',
		'1.20'
	],
	['32.13', '32', '13', 'Evaluación y estudio higiénico-sanitario de empresas', '1.20'],
	[
		'32.14',
		'32',
		'14',
		'Otorgamiento y renovación de permisos para la compraventa de sustancias psicotrópicas y estupefacientes lícitas',
		'1.20'
	],
	[
		'32.15',
		'32',
		'15',
		'Registro y sellado de libros para el control de sustancias estupefacientes y psicotrópicas',
		'1.20'
	],
	['32.16', '32', '16', 'Certificado de libre venta y consumo de productos alimenticios', '1.20'],
	['32.17', '32', '17', 'Constancia de registro sanitario de productos alimenticios', '1.20'],
	['32.18', '32', '18', 'Certificación sanitaria de la calidad de alimentos', '1.20'],
	['32.19', '32', '19', 'Permiso sanitario para importación de alimentos', '1.20'],
	['32.20', '32', '20', 'Certificación de ingredientes para la elaboración de alimentos', '1.20'],
	['32.21', '32', '21', 'Certificación sanitaria de materiales en contacto con alimentos', '1.20'],
	[
		'32.22',
		'32',
		'22',
		'Certificación sanitaria de equipos y utensilios para el manejo de productos alimenticios',
		'1.20'
	],
	[
		'32.23',
		'32',
		'23',
		'Permiso sanitario para el funcionamiento de industrias de alimentos',
		'2.00'
	],
	[
		'32.24',
		'32',
		'24',
		'Permiso sanitario para el funcionamiento de expendio y almacenamiento de alimentos',
		'2.00'
	],
	[
		'32.25',
		'32',
		'25',
		'Permiso sanitario para expendios ambulantes y transporte de alimentos',
		'1.20'
	],
	[
		'32.26',
		'32',
		'26',
		'Constancia o informe técnico de operatividad y funcionamiento, distinto de los regulados en otros artículos',
		'1.20'
	],
	[
		'32.27',
		'32',
		'27',
		'Autorización para prácticas sujetas al régimen de excepciones de la ley de antimonopolio',
		'1.20'
	],
	['32.28', '32', '28', 'Autorización y registro sanitario de productos cosméticos', '1.20'],
	['32.29', '32', '29', 'Asesoría técnico-científica y revisión de expedientes', '1.20'],
	['32.30', '32', '30', 'Autorización para el registro de productos cosméticos', '1.20'],
	[
		'32.31',
		'32',
		'31',
		'Inspección para instalación de establecimientos distribuidores de productos cosméticos',
		'1.20'
	],
	['32.32', '32', '32', 'Cambio de fórmula cosmética (reformulación)', '1.20'],
	['32.33', '32', '33', 'Otros conceptos cosméticos', '1.20'],
	['32.34', '32', '34', 'Certificado de libre venta', '1.00'],
	['32.35', '32', '35', 'Constancia de fórmula aprobada', '1.00'],
	['32.36', '32', '36', 'Copia certificada de registro', '1.20'],
	['32.37', '32', '37', 'Copia certificada de documentos', '1.20'],
	['32.38', '32', '38', 'Cambio de fabricante', '1.00'],
	['32.39', '32', '39', 'Cambio de propietario', '1.20'],
	['32.40', '32', '40', 'Cambio de razón social', '1.00'],
	['32.41', '32', '41', 'Cambio de establecimiento distribuidor', '1.20'],
	['32.42', '32', '42', 'Cambio de patrocinante', '1.20'],
	[
		'32.43',
		'32',
		'43',
		'Permiso de exportación de productos farmacéuticos, productos naturales y cosméticos',
		'2.00'
	],
	['32.44', '32', '44', 'Permisos de importación', '2.00'],
	['32.45', '32', '45', 'Publicación, autorización y renovación', '1.20'],
	['32.46', '32', '46', 'Cambio de denominación comercial', '1.20'],
	['32.47', '32', '47', 'Cambio o periodo de validez', '1.20'],
	['32.48', '32', '48', 'Cambio por modificación de rótulos o empaques (post-registro)', '1.20'],
	[
		'32.49',
		'32',
		'49',
		'Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental',
		'1.20'
	],
	[
		'32.50',
		'32',
		'50',
		'Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos',
		'1.20'
	],
	[
		'33.1',
		'33',
		'1',
		'Autorización de industrias productoras de alcohol y especies alcohólicas, o ampliación de las ya instaladas',
		'10.00'
	],
	[
		'33.1.renovacion',
		'33',
		'1',
		'Renovación anual de la autorización de industrias productoras de alcohol y especies alcohólicas',
		'10.00'
	],
	[
		'33.2.urbana',
		'33',
		'2',
		'Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas urbanas',
		'8.00'
	],
	[
		'33.2.suburbana',
		'33',
		'2',
		'Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas suburbanas',
		'6.00'
	],
	[
		'33.2.renovacion',
		'33',
		'2',
		'Renovación anual de las autorizaciones de expendios de bebidas alcohólicas',
		'6.00'
	],
	[
		'33.3',
		'33',
		'3',
		'Autorización a personas naturales para operar como agentes de aduanas',
		'2.00'
	],
	[
		'33.4',
		'33',
		'4',
		'Autorización a personas jurídicas para operar como agentes de aduanas',
		'35.00'
	],
	['33.5', '33', '5', 'Autorización para operar bajo el régimen de puerto libre', '10.00'],
	[
		'33.6',
		'33',
		'6',
		'Autorización para operar como almacenes generales de depósito, depósitos temporales, depósitos aduaneros y almacenes de impuesto',
		'10.00'
	],
	[
		'34.1',
		'34',
		'1',
		'Registro de proyectos para el establecimiento de nuevas industrias o la ampliación de las ya instaladas',
		'10.00'
	],
	[
		'34.2',
		'34',
		'2',
		'Certificados o informes periciales técnicos sobre la calidad de bienes y servicios',
		'6.00'
	],
	[
		'34.3',
		'34',
		'3',
		'Certificación de lotes o partidas de productos, materiales, partes y componentes',
		'4.00'
	],
	['34.4', '34', '4', 'Certificación de calidad de productos o servicios', '4.00'],
	['34.5', '34', '5', 'Evaluación del control de calidad', '6.00'],
	[
		'34.6',
		'34',
		'6',
		'Análisis químico o físico-químico de productos y mercancías para su clasificación arancelaria',
		'6.00'
	],
	[
		'34.7',
		'34',
		'7',
		'Aprobación para la colocación de vallas publicitarias en los laterales de la vialidad, fuera del derecho de vía',
		'5.00'
	],
	['34.10', '34', '10', 'Solicitud de licencias para expender timbres fiscales', '1.00'],
	[
		'34.11',
		'34',
		'11',
		'Otorgamiento o renovación de licencia para expendio de timbres fiscales',
		'1.00'
	],
	[
		'34.parrafo',
		'34',
		'parrafo',
		'Constancias, solicitudes u otros actos emitidos por entes, empresas e instituciones adscritos a la Gobernación del estado Trujillo',
		'2.00'
	],
	[
		'35.1',
		'35',
		'1',
		'Certificados de registro de marcas, lemas, denominaciones comerciales, patentes, modelos, dibujos industriales e introducción de invento o mejora',
		'8.00'
	],
	[
		'35.2',
		'35',
		'2',
		'Nombres y denominaciones de empresas mercantiles y firmas comerciales ante el Registro Mercantil',
		'12.00'
	],
	[
		'35.3',
		'35',
		'3',
		'Registro de documentos constitutivos de sociedades de comercio e inscripción de modificaciones al documento constitutivo y a los estatutos',
		'23.00'
	],
	[
		'35.4',
		'35',
		'4',
		'Registro de sociedades extranjeras, domiciliaciones, agencias, sucursales o representaciones, y sus actuaciones sucesivas',
		'25.00'
	],
	[
		'35.4.folio',
		'35',
		'4',
		'Registro de sociedades extranjeras, por cada folio de inscripción',
		'0.20'
	],
	[
		'35.7',
		'35',
		'7',
		'Registro de sociedades accidentales y consorcios en el Registro Mercantil',
		'12.00'
	],
	[
		'35.8.hasta50',
		'35',
		'8',
		'Registro de la venta de un fondo de comercio, del 1 % al 50 %',
		'12.00'
	],
	[
		'35.8.desde51',
		'35',
		'8',
		'Registro de la venta de un fondo de comercio, del 51 % al 100 %',
		'23.00'
	],
	[
		'35.9.a',
		'35',
		'9.a',
		'Poder de comerciante a factores y dependientes, si el poderdante es persona jurídica',
		'3.00'
	],
	[
		'35.9.b',
		'35',
		'9.b',
		'Poder de comerciante a factores y dependientes, si el poderdante es persona natural',
		'1.50'
	],
	['35.10.a', '35', '10.a', 'Cualquier otro poder, si el poderdante es persona jurídica', '3.00'],
	['35.10.b', '35', '10.b', 'Cualquier otro poder, si el poderdante es persona natural', '1.50'],
	[
		'35.11',
		'35',
		'11',
		'Cualquier solicitud dirigida a las notarías públicas, sin perjuicio de los demás tributos',
		'1.00'
	],
	[
		'35.12',
		'35',
		'12',
		'Inscripción de cualquier otro documento en los registros de comercio, distinto de los regulados por otros artículos',
		'5.00'
	],
	[
		'35.12.b',
		'35',
		'12.b',
		'Inscripción en los registros de comercio, por cada folio adicional',
		'1.00'
	],
	[
		'36.1',
		'36',
		'1',
		'Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico',
		'1.50'
	],
	[
		'36.2',
		'36',
		'2',
		'Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico',
		'1.50'
	],
	[
		'36.4',
		'36',
		'4',
		'Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico',
		'1.50'
	],
	[
		'36.5',
		'36',
		'5',
		'Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico',
		'1.50'
	],
	[
		'36.6',
		'36',
		'6',
		'Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico',
		'1.50'
	],
	[
		'36.7',
		'36',
		'7',
		'Registro de interesado para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso doméstico',
		'1.20'
	],
	[
		'36.8',
		'36',
		'8',
		'Registro de interesado para la aplicación de plaguicidas de uso doméstico',
		'1.20'
	],
	[
		'36.9',
		'36',
		'9',
		'Permiso para fumigaciones aéreas con plaguicidas de uso doméstico en zonas residenciales',
		'1.50'
	],
	['37.1', '37', '1', 'Habitabilidad de vivienda, por metro cuadrado', '0.10'],
	['37.2', '37', '2', 'Habitabilidad de comercio, por metro cuadrado', '0.40'],
	['37.3', '37', '3', 'Habitabilidad industrial, por metro cuadrado', '0.40'],
	['37.4', '37', '4', 'Conformidad sanitaria de aptitud de condominio, por metro cuadrado', '0.10'],
	['37.5', '37', '5', 'Conformación sanitaria para cambio de uso del local', '1.50'],
	['37.6', '37', '6', 'Conformación sanitaria para desarrollos urbanísticos', '2.00'],
	[
		'37.7',
		'37',
		'7',
		'Conformación sanitaria de integración, parcelamiento y cambio de uso de parcela, por metro cuadrado',
		'1.00'
	],
	[
		'37.8',
		'37',
		'8',
		'Conformación sanitaria de proyectos de tratamiento de aguas blancas y residuales, por metro cúbico',
		'0.40'
	],
	[
		'37.9',
		'37',
		'9',
		'Conformación sanitaria de instalación y funcionamiento de industrias',
		'2.00'
	],
	[
		'38.1',
		'38',
		'1',
		'Registro para la fabricación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal',
		'1.70'
	],
	[
		'38.2',
		'38',
		'2',
		'Registro para distribución, expendio, publicidad, almacenamiento y transporte de plaguicidas agrícolas o pecuarios, fertilizantes, abonos y productos de uso animal',
		'1.70'
	],
	[
		'38.3',
		'38',
		'3',
		'Registro para la aplicación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal',
		'1.70'
	],
	[
		'38.4',
		'38',
		'4',
		'Registro de productos biológicos, medicamentos y alimentos para uso animal',
		'1.70'
	],
	[
		'38.5',
		'38',
		'5',
		'Autorización para la fabricación de plaguicidas de uso agrícola, fertilizantes y abonos',
		'1.70'
	],
	[
		'38.6',
		'38',
		'6',
		'Autorización para expendio, aplicación comercial, depósito, publicidad, formulación y envasado de plaguicidas de uso agrícola',
		'1.70'
	],
	[
		'38.7',
		'38',
		'7',
		'Certificado de libre venta de plaguicidas de uso agrícola, fertilizantes, abonos biológicos y productos de uso animal',
		'1.70'
	],
	['39.1', '39', '1', 'Permiso para el funcionamiento de pool y billar', '10.00'],
	['39.2', '39', '2', 'Renovación de permisos de pool y billar', '5.00'],
	['39.3', '39', '3', 'Permiso para el funcionamiento de parley o sport book', '10.00'],
	['39.4', '39', '4', 'Renovación de permisos de parley o sport book', '5.00'],
	['39.5.a', '39', '5.a', 'Permiso para el funcionamiento de bingos y casinos', '3.00'],
	['39.5.b', '39', '5.b', 'Cada inscripción en el libro de bingos y casinos', '3.00'],
	[
		'39.5.c',
		'39',
		'5.c',
		'Inscripción en el registro de organizaciones de juegos y apuestas lícitas',
		'3.00'
	],
	[
		'39.5.d',
		'39',
		'5.d',
		'Permiso para la organización eventual de juegos y apuestas lícitas',
		'3.00'
	],
	['39.6', '39', '6', 'Identificación de cada máquina o aparato de juegos', '3.00'],
	['40.1', '40', '1', 'Permiso de dotación de agua para uso doméstico', '1.50'],
	['40.2', '40', '2', 'Permiso de dotación de agua para uso sanitario industrial', '1.50'],
	['40.3', '40', '3', 'Permiso de perforación de pozos profundos', '1.50'],
	[
		'40.4',
		'40',
		'4',
		'Permiso de perforación de sistemas de tratamiento de aguas blancas y servidas',
		'1.50'
	],
	[
		'40.5',
		'40',
		'5',
		'Permiso de operación para empresa de limpieza y desinfección de estanques de agua potable',
		'1.50'
	],
	['40.6', '40', '6', 'Permiso para transporte de agua en camión cisterna', '1.50'],
	[
		'41.1',
		'41',
		'1',
		'Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.2',
		'41',
		'2',
		'Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.3',
		'41',
		'3',
		'Autorización para almacenar plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.4',
		'41',
		'4',
		'Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario, industrial o agropecuario',
		'1.50'
	],
	[
		'41.5',
		'41',
		'5',
		'Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.6',
		'41',
		'6',
		'Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.7',
		'41',
		'7',
		'Registro para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso sanitario o industrial',
		'1.20'
	],
	[
		'41.8',
		'41',
		'8',
		'Registro para la aplicación de plaguicidas de uso sanitario o industrial',
		'1.20'
	],
	[
		'41.9',
		'41',
		'9',
		'Permiso para fumigaciones aéreas con plaguicidas de uso sanitario o industrial',
		'1.50'
	],
	[
		'41.10',
		'41',
		'10',
		'Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental',
		'1.20'
	],
	[
		'41.11',
		'41',
		'11',
		'Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos',
		'1.20'
	],
	['42.1', '42', '1', 'Constancia de registro de hierros', '2.00'],
	['42.2', '42', '2', 'Constancia de registro de señal', '2.00'],
	[
		'44.1.a',
		'44',
		'1.a',
		'Servicios técnicos forestales de madera en rolas y escuadrada importada, por metro cúbico',
		'0.40'
	],
	[
		'44.1.b',
		'44',
		'1.b',
		'Servicios técnicos forestales de madera aserrada importada, por metro cúbico',
		'0.40'
	],
	[
		'44.2.a',
		'44',
		'2.a',
		'Estantes, estantillos, viguetas, barras, listones de mangle y otras especies importados, por unidad',
		'1.00'
	],
	['44.2.b', '44', '2.b', 'Cogollos de palmitos importados, por unidad', '1.00'],
	['44.3', '44', '3', 'Fibras de palma de chiquichiqui, por kilogramo', '1.00'],
	[
		'44.4',
		'44',
		'4',
		'Horcones, vigas, viguetones, tirantes, soleras, costillas, madrinas, puntales y esquineros, por unidad',
		'1.00'
	],
	['44.5', '44', '5', 'Postes', '1.00'],
	['44.6', '44', '6', 'Leñas', '1.00'],
	['44.7', '44', '7', 'Carbón vegetal, por tonelada', '1.00'],
	[
		'44.8',
		'44',
		'8',
		'Permiso o autorización de deforestación y roza que no origine aprovechamiento forestal, por hectárea autorizada',
		'1.00'
	],
	[
		'44.9',
		'44',
		'9',
		'Certificación de ubicación en áreas bajo régimen de administración especial, por una hectárea',
		'1.00'
	],
	[
		'44.9.adicional',
		'44',
		'9',
		'Certificación de ubicación en áreas bajo régimen de administración especial, por hectárea o fracción adicional',
		'0.20'
	],
	['44.10', '44', '10', 'Autorización para la afectación de recursos naturales', '1.00'],
	[
		'44.11',
		'44',
		'11',
		'Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por una hectárea',
		'1.00'
	],
	[
		'44.11.adicional',
		'44',
		'11',
		'Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por hectárea o fracción adicional',
		'0.50'
	],
	['44.12', '44', '12', 'Afectación de recursos naturales para actividades industriales', '1.00'],
	[
		'44.12.adicional',
		'44',
		'12',
		'Afectación de recursos naturales para actividades industriales, por hectárea o fracción adicional',
		'0.50'
	],
	[
		'44.13.a',
		'44',
		'13.a',
		'Licencia o permiso de exploración, extracción y aprovechamiento de minerales no metálicos, hasta por una hectárea',
		'5.00'
	],
	[
		'44.13.a.adicional',
		'44',
		'13.a',
		'Licencia o permiso de minerales no metálicos, por cada hectárea adicional',
		'0.40'
	],
	['44.13.b', '44', '13.b', 'Declaratoria de impacto ambiental', '1.00'],
	[
		'44.14.a',
		'44',
		'14.a',
		'Evaluación y estudio de laboratorio de suelos: análisis de rutina',
		'1.00'
	],
	[
		'44.14.b',
		'44',
		'14.b',
		'Evaluación y estudio de laboratorio de suelos: análisis de calicata',
		'1.00'
	],
	[
		'44.14.c',
		'44',
		'14.c',
		'Evaluación y estudio de laboratorio de suelos: análisis de salinidad',
		'1.00'
	],
	[
		'44.14.d',
		'44',
		'14.d',
		'Evaluación y estudio de laboratorio de suelos: análisis de física de suelos',
		'1.00'
	],
	[
		'44.14.e',
		'44',
		'14.e',
		'Evaluación y estudio de laboratorio de suelos: análisis de fertilidad',
		'1.00'
	],
	['44.14.f', '44', '14.f', 'Evaluación y estudio de análisis integrado de suelos y aguas', '1.00'],
	[
		'44.15',
		'44',
		'15',
		'Autorización de funcionamiento a personas que realicen actividades susceptibles de degradar el ambiente',
		'2.00'
	],
	[
		'44.16',
		'44',
		'16',
		'Estudio, análisis y evaluación para el registro de actividades susceptibles de degradar el ambiente',
		'2.00'
	],
	[
		'44.16.renovacion',
		'44',
		'16',
		'Renovación anual de la autorización de funcionamiento del numeral 15: 50 % del monto establecido',
		'1.00'
	],
	[
		'44.17',
		'44',
		'17',
		'Estudio, análisis y evaluación permanente de actividades que generen contaminación sónica',
		'2.00'
	],
	[
		'45.1',
		'45',
		'1',
		'Actos, documentos u otorgamientos no previstos en el instrumento, emitidos en el estado Trujillo',
		'2.00'
	],
	[
		'47.1',
		'47',
		'1',
		'Legalización de firmas de funcionarios de órganos o entes adscritos al Ejecutivo del estado Trujillo',
		'1.00'
	],
	[
		'47.2',
		'47',
		'2',
		'Inscripción de empresas o firmas personales en el Registro de Contratistas, proveedores y prestadores de servicios',
		'10.00'
	],
	[
		'47.2.renovacion',
		'47',
		'2',
		'Renovación anual de la inscripción en el Registro de Contratistas: 50 % del tributo',
		'5.00'
	],
	[
		'47.3',
		'47',
		'3',
		'Manifestación de voluntad para participar en procesos de contratación pública del estado Trujillo',
		'10.00'
	],
	[
		'47.4',
		'47',
		'4',
		'Solicitud de adquisición de guías de circulación de materiales no metálicos por mineros autorizados o registrados',
		'25.00'
	],
	[
		'48.1',
		'48',
		'1',
		'Autorización a personas naturales o jurídicas para el expendio de timbres fiscales',
		'1.00'
	],
	[
		'48.1.renovacion',
		'48',
		'1',
		'Renovación anual de la autorización para el expendio de timbres fiscales: 100 % del tributo',
		'1.00'
	],
	[
		'48.2',
		'48',
		'2',
		'Solicitud de adquisición de timbres fiscales por expendedores o distribuidores mayoristas autorizados',
		'0.50'
	],
	[
		'48.3',
		'48',
		'3',
		'Solicitud de habilitación de libros ante el órgano de Administración Tributaria del estado Trujillo',
		'0.50'
	]
].map(([code, article, item, concept, times]) => ({ code, article, item, concept, times }));
