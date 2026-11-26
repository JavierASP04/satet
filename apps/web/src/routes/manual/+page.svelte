<script>
	import { APP_NAME } from '@satet/shared';
	import Button from '#lib/components/Button.svelte';
</script>

<svelte:head>
	<title>Manual de usuario · {APP_NAME}</title>
</svelte:head>

<div class="page">
	<header>
		<a class="brand" href="/">
			<span>S</span>
			{APP_NAME}
		</a>
		<Button href="/login" variant="ghost">Iniciar sesión</Button>
	</header>

	<article>
		<p class="kicker">Gobernación del Estado Trujillo</p>
		<h1>Manual de usuario</h1>
		<p class="lede">
			Así se usa el SATET: crear la cuenta, declarar, pagar y consultar. El texto sigue las pantallas del sistema.
		</p>

		<nav>
			<a href="#registro">Registro</a>
			<a href="#roles">Roles</a>
			<a href="#mineria">Declaraciones</a>
			<a href="#regalias">Regalías</a>
			<a href="#mil">1 por mil</a>
			<a href="#timbres">Timbres</a>
			<a href="#pagos">Pagos</a>
			<a href="#reportes">Reportes</a>
		</nav>

		<section id="registro">
			<h2>Registro</h2>
			<p>En la portada elige Registrarse. Hay dos tipos de cuenta:</p>
			<ul>
				<li>Contribuyente, para empresas que declaran minería, el 1 por mil y timbres.</li>
				<li>Persona natural, para quien usa sobre todo los timbres.</li>
			</ul>
			<p>
				Primero van el correo y la contraseña. Después, los datos fiscales: documento, RIF, nombre, dirección, teléfono y representante. Al terminar, entras con el correo y la contraseña. Entrar no espera aprobación.
			</p>
			<p>
				Mientras el expediente no esté aprobado, solo puedes ver tu perfil. No puedes declarar, comprar timbres ni registrar pagos. Fiscalización o el administrador aprueban el expediente. Si lo rechazan, esa cuenta no usa los tributos.
			</p>
		</section>

		<section id="roles">
			<h2>Roles</h2>
			<ul>
				<li>
					<strong>Contribuyente.</strong> Declara minería y el 1 por mil, solicita timbres y registra pagos, cuando el expediente está aprobado.
				</li>
				<li>
					<strong>Persona natural.</strong> Solicita timbres y registra pagos. No declara minería ni el 1 por mil.
				</li>
				<li>
					<strong>Recaudación.</strong> Concilia pagos, administra las cuentas institucionales, aprueba o rechaza timbres y consulta el tablero.
				</li>
				<li>
					<strong>Fiscalización.</strong> Aprueba expedientes y revisa, aprueba o rechaza declaraciones mineras, el 1 por mil y regalías.
				</li>
				<li>
					<strong>Administrador.</strong> Usa todo el sistema. Además indica cómo se paga cada regalía y crea las cuentas de Recaudación y Fiscalización en Funcionarios.
				</li>
			</ul>
			<p>El menú de la izquierda muestra solo lo que corresponde a tu rol.</p>
		</section>

		<section id="mineria">
			<h2>Declaraciones mineras</h2>
			<p>
				En Impuesto minero, Nueva declaración, indicas el mes, los materiales y el pago. Cada material lleva la actividad, el tipo, el volumen en metros cúbicos y el valor comercial. Las alícuotas que muestra el formulario son: extracción 6 %, procesamiento 5 %, producto 1 % y premezclado 2 %.
			</p>
			<p>
				La declaración del mes anterior está en término hasta el día 10. Después de esa fecha, o si declaras otro mes, queda marcada como fuera de tiempo. No se calcula una multa.
			</p>
			<p>
				No puedes presentar un mes posterior si tienes un mes anterior sin verificar, o si falta algún mes desde tu primera declaración. El primer mes que declares no pide historia anterior.
			</p>
			<p>
				Junto con la declaración van la referencia bancaria, la cuenta institucional y el comprobante. El comprobante es una foto JPEG o PNG, o un PDF, de hasta 2 MB. Puedes copiar los datos de la cuenta con el botón Copiar datos. La planilla se imprime cuando el pago quedó verificado.
			</p>
		</section>

		<section id="regalias">
			<h2>Regalías</h2>
			<p>
				En Regalías mineras el primer paso es solo el año y los metros cuadrados extraídos. El botón dice Presentar solicitud de regalía. No se pide el pago en ese momento.
			</p>
			<p>
				El monto lo calcula el sistema: los metros cuadrados por el valor de la extracción que ya declaraste en ese año, al 7 %. Si ese año no tiene meses con extracción, la solicitud no se acepta. Solo hay una regalía por año. Si un año anterior sigue sin pagar, no puedes solicitar el siguiente.
			</p>
			<p>
				El administrador indica la forma de pago: total en dinero, fraccionado o en especie. Recién entonces, si no es en especie, ves la referencia, la cuenta y el comprobante. El fraccionado se registra con un solo comprobante por el monto completo. La planilla sale cuando ese pago fue registrado y verificado.
			</p>
		</section>

		<section id="mil">
			<h2>1 por mil</h2>
			<p>
				En Cargar órdenes de pago puedes enviar varias órdenes juntas, hasta cien. Cada orden lleva el número, el ente o banco, el monto ejecutado y la fecha. El impuesto es el monto dividido entre 1.000 y se ve mientras cargas.
			</p>
			<p>
				La carga comparte una referencia, una cuenta institucional y un comprobante. Copiar datos copia el banco y el número de cuenta. La planilla se imprime cuando la carga está verificada.
			</p>
		</section>

		<section id="timbres">
			<h2>Timbres</h2>
			<p>
				En Comprar timbre fiscal eliges el trámite del tabulador. El monto en bolívares sale de ese valor en euros y de la tasa oficial del día.
			</p>
			<p>
				La solicitud queda pendiente. Registra el pago y espera a que Recaudación o el administrador lo aprueben. Si lo rechazan, indican el motivo. El timbre no se descarga mientras el pago no esté aprobado.
			</p>
			<p>
				El timbre aprobado dura 15 días desde su emisión. El documento muestra la fecha de emisión, la fecha en que caduca, los días que faltan, el trámite, el serial y el código QR. Al leer el QR se abre una consulta con esos datos y si el timbre está pendiente, válido, vencido, rechazado o anulado. Un timbre vencido ya no se puede usar.
			</p>
		</section>

		<section id="pagos">
			<h2>Pagos</h2>
			<p>
				En Registrar pago indicas el tributo, la referencia, la cuenta institucional, la fecha, el monto y el comprobante. La referencia no puede repetirse en el sistema: si ya existe, el pago no se guarda.
			</p>
			<p>
				Recaudación revisa cada pago en Conciliación. Puede aprobarlo o rechazarlo con un motivo. Si lo rechaza, la planilla de esa obligación no se imprime. En Mis pagos ves el estado y el aviso cuando hay un rechazo.
			</p>
			<p>
				El sistema también avisa, arriba, si tienes declaraciones, regalías o pagos pendientes.
			</p>
		</section>

		<section id="reportes">
			<h2>Reportes</h2>
			<p>
				Recaudación y el administrador ven el tablero. Separa lo recaudado en minería, 1 por mil y timbres, y permite comparar por día, semana, quincena, mes o año. También cuenta los usuarios atendidos, los timbres vendidos y el monto de timbres.
			</p>
			<p>
				Puedes descargar la lista en Excel y el resumen en PDF. El tablero muestra lo ya cobrado. No compara contra una meta.
			</p>
		</section>
	</article>
</div>

<style>
	.page {
		max-width: 46rem;
		margin: 0 auto;
		padding: 1.25rem 1.25rem 4rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--ink);
		font-weight: 750;
		text-decoration: none;
	}

	.brand span {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 0.7rem;
		background: var(--wine-deep);
		color: #fff;
	}

	.kicker {
		margin: 0;
		color: var(--wine);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0.35rem 0 0;
		font-family: var(--display);
		font-size: 2.4rem;
		letter-spacing: -0.04em;
	}

	.lede {
		margin: 0.8rem 0 0;
		color: var(--muted);
		font-size: 1.05rem;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin: 1.4rem 0 0.4rem;
	}

	nav a {
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font-size: 0.88rem;
		text-decoration: none;
	}

	section {
		margin-top: 2rem;
		padding-top: 0.2rem;
	}

	h2 {
		margin: 0 0 0.6rem;
		font-size: 1.45rem;
		letter-spacing: -0.03em;
	}

	p,
	li {
		color: var(--ink);
	}

	ul {
		margin: 0.4rem 0 0.8rem;
		padding-left: 1.15rem;
	}

	li + li {
		margin-top: 0.35rem;
	}
</style>
