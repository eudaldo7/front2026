
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const API_URL = 'http://127.0.0.1:8001';

	interface Usuario {
		id_usuario: number;
		nombre: string;
		apellido: string;
		correo: string;
		id_rol: number;
		rol: string;
	}

	interface Modulo {
		id_modulo: number;
		nombre: string;
		descripcion?: string | null;
	}

	let usuario = $state<Usuario | null>(null);
	let modulos = $state<Modulo[]>([]);
	let cargandoModulos = $state(false);
	let errorMenu = $state('');

	function normalizar(texto: string): string {
		return texto
			.trim()
			.toLocaleLowerCase('es')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');
	}

	const nombresModulos = $derived(
		new Set(modulos.map((modulo) => normalizar(modulo.nombre)))
	);

	function tieneModulo(...nombres: string[]): boolean {
		return nombres.some((nombre) =>
			nombresModulos.has(normalizar(nombre))
		);
	}

	const mostrarDashboard = $derived(tieneModulo('Dashboard'));

	// Tablero utiliza el permiso existente del Dashboard.
	const mostrarTablero = $derived(mostrarDashboard);

	const mostrarEstudiantes = $derived(tieneModulo('Estudiantes'));
	const mostrarRiesgos = $derived(tieneModulo('Riesgos'));
	const mostrarCasos = $derived(tieneModulo('Casos'));
	const mostrarSeguimientos = $derived(tieneModulo('Seguimientos'));
	const mostrarReportes = $derived(tieneModulo('Reportes'));
	const mostrarNotificaciones = $derived(tieneModulo('Notificaciones'));
	const mostrarAsistencias = $derived(tieneModulo('Asistencias'));
	const mostrarCalificaciones = $derived(tieneModulo('Calificaciones'));
	const mostrarConvivencia = $derived(tieneModulo('Convivencia'));
	const mostrarEvidencias = $derived(tieneModulo('Evidencias'));
	const mostrarUsuarios = $derived(tieneModulo('Usuarios'));
	const mostrarRoles = $derived(tieneModulo('Roles'));
	const mostrarAlertas = $derived(tieneModulo('Alertas'));
	const mostrarEstadisticas = $derived(tieneModulo('Estadísticas'));
	const mostrarHistorial = $derived(tieneModulo('Historial'));
	const mostrarCursos = $derived(tieneModulo('Cursos'));

	const mostrarSeguimientoAcademico = $derived(
		mostrarAsistencias || mostrarCalificaciones || mostrarConvivencia
	);

	const mostrarAlertasCasos = $derived(
		mostrarRiesgos ||
			mostrarCasos ||
			mostrarSeguimientos ||
			mostrarEvidencias ||
			mostrarNotificaciones ||
			mostrarAlertas ||
			mostrarHistorial
	);

	// Administración solo mostrará Usuarios, Roles y Cursos.
	const mostrarAdministracion = $derived(
		mostrarUsuarios || mostrarRoles || mostrarCursos
	);

	const mostrarReportesGrupo = $derived(
		mostrarReportes || mostrarEstadisticas
	);

	onMount(() => {
		void cargarSesionYModulos();
	});

	async function cargarSesionYModulos() {
		errorMenu = '';

		const sesionGuardada = localStorage.getItem('usuarioSesion');
		const token = localStorage.getItem('tokenAcceso');

		if (!sesionGuardada || !token) {
			usuario = null;
			modulos = [];
			await goto('/');
			return;
		}

		try {
			const sesion = JSON.parse(sesionGuardada) as Usuario;

			if (!sesion.id_usuario || !sesion.correo) {
				throw new Error(
					'La sesión guardada no contiene un usuario válido.'
				);
			}

			usuario = sesion;
			cargandoModulos = true;

			const respuesta = await fetch(`${API_URL}/roles/mis-modulos`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (respuesta.status === 401) {
				localStorage.removeItem('tokenAcceso');
				localStorage.removeItem('usuarioSesion');
				usuario = null;
				modulos = [];
				await goto('/');
				return;
			}

			if (!respuesta.ok) {
				throw new Error(
					`La API respondió con el código ${respuesta.status}.`
				);
			}

			const resultado = await respuesta.json();

			if (!Array.isArray(resultado.modulos)) {
				throw new Error(
					'La respuesta de la API no contiene una lista de módulos.'
				);
			}

			modulos = resultado.modulos;
		} catch (error) {
			console.error('Error al cargar los módulos:', error);

			errorMenu =
				error instanceof Error
					? error.message
					: 'No fue posible cargar los módulos.';

			modulos = [];
		} finally {
			cargandoModulos = false;
		}
	}

	async function cerrarSesion() {
		localStorage.removeItem('usuarioSesion');
		localStorage.removeItem('tokenAcceso');

		usuario = null;
		modulos = [];

		await goto('/');
	}
</script>

{#if usuario}
	<nav class="navbar navbar-expand-lg navbar-custom shadow-sm">
		<div class="container-fluid navbar-container">
			<a class="navbar-brand" href="/dashboard">
				<span class="brand-icon">🎓</span>
				<span>Alerta Temprana</span>
			</a>

			<button
				class="navbar-toggler"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#menuPrincipal"
				aria-controls="menuPrincipal"
				aria-expanded="false"
				aria-label="Mostrar menú"
			>
				<span class="navbar-toggler-icon"></span>
			</button>

			<div class="collapse navbar-collapse" id="menuPrincipal">
				<div class="navbar-nav">
					{#if mostrarDashboard}
						<a class="nav-link" href="/dashboard">
							📊 Dashboard
						</a>
					{/if}

					{#if mostrarTablero}
						<a class="nav-link enlace-tablero" href="/tablero">
							📈 Tablero
						</a>
					{/if}

					{#if mostrarEstudiantes}
						<a class="nav-link" href="/estudiantes">
							🎓 Estudiantes
						</a>
					{/if}

					{#if mostrarSeguimientoAcademico}
						<details class="menu-group">
							<summary class="nav-link">
								📝 Seguimiento académico
							</summary>

							<div class="dropdown-menu-custom">
								{#if mostrarAsistencias}
									<a href="/asistencias">📅 Asistencias</a>
								{/if}

								{#if mostrarCalificaciones}
									<a href="/notas">📚 Calificaciones</a>
								{/if}

								{#if mostrarConvivencia}
									<a href="/convivencias">🤝 Convivencia</a>
								{/if}
							</div>
						</details>
					{/if}

					{#if mostrarAlertasCasos}
						<details class="menu-group">
							<summary class="nav-link">
								🚦 Alertas y casos
							</summary>

							<div class="dropdown-menu-custom">
								{#if mostrarRiesgos}
									<a href="/riesgos">🚨 Riesgos</a>
								{/if}

								{#if mostrarCasos}
									<a href="/casos">📂 Casos</a>
								{/if}

								{#if mostrarSeguimientos}
									<a href="/seguimientos">🔎 Seguimientos</a>
								{/if}

								{#if mostrarEvidencias}
									<a href="/evidencias">📁 Evidencias</a>
								{/if}

								{#if mostrarNotificaciones}
									<a href="/notificaciones">🔔 Notificaciones</a>
								{/if}

								{#if mostrarAlertas}
									<a href="/alertas">⚠️ Alertas</a>
								{/if}

								{#if mostrarHistorial}
									<a href="/historial">📜 Historial</a>
								{/if}
							</div>
						</details>
					{/if}

					{#if mostrarReportesGrupo}
						<details class="menu-group">
							<summary class="nav-link">📈 Reportes</summary>

							<div class="dropdown-menu-custom">
								{#if mostrarReportes}
									<a href="/reportes">📊 Reportes</a>
								{/if}

								{#if mostrarEstadisticas}
									<a href="/estadisticas">📈 Estadísticas</a>
								{/if}
							</div>
						</details>
					{/if}

					{#if mostrarAdministracion}
						<details class="menu-group">
							<summary class="nav-link">⚙️ Administración</summary>

							<div class="dropdown-menu-custom dropdown-right">
								{#if mostrarUsuarios}
									<a href="/usuarios">👥 Usuarios</a>
								{/if}

								{#if mostrarRoles}
									<a href="/roles">🛡️ Roles</a>
								{/if}

								{#if mostrarCursos}
									<a href="/cursos">📚 Cursos</a>
								{/if}
							</div>
						</details>
					{/if}
				</div>

				<div class="user-menu">
					<div class="user-info">
						<strong title={usuario.correo}>
							{usuario.correo}
						</strong>
						<span>{usuario.rol}</span>
					</div>

					<button class="btn-logout" onclick={cerrarSesion}>
						↪ Salir
					</button>
				</div>

				{#if cargandoModulos}
					<span class="nav-status">Cargando módulos...</span>
				{/if}

				{#if errorMenu}
					<span class="nav-status" role="alert">
						{errorMenu}
					</span>
				{/if}
			</div>
		</div>
	</nav>
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	.navbar-custom {
		width: 100%;
		max-width: 100%;
		min-width: 0;
		min-height: 72px;
		background: linear-gradient(100deg, #1769aa, #168aad, #20a486);
	}

	.navbar-container {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		padding: 10px 16px;
	}

	.navbar-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		margin: 0;
		color: #fff;
		font-size: 1.05rem;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}

	.navbar-brand:hover {
		color: #d8fff2;
	}

	.brand-icon {
		display: grid;
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		place-items: center;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.18);
	}

	.navbar-toggler {
		flex: 0 0 auto;
		margin-left: auto;
		border-color: rgba(255, 255, 255, 0.6);
	}

	.navbar-toggler-icon {
		filter: brightness(0) invert(1);
	}

	.navbar-collapse {
		flex: 1 1 auto;
		min-width: 0;
	}

	.navbar-nav {
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		justify-content: flex-end;
		gap: 3px;
		min-width: 0;
	}

	.navbar-nav .nav-link {
		display: block;
		padding: 9px 8px;
		border-radius: 9px;
		color: #fff;
		font-size: 0.86rem;
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	.navbar-nav .nav-link:hover,
	.menu-group[open] > summary {
		background: rgba(255, 255, 255, 0.18);
		color: #fff;
	}

	/* Diferenciar visualmente el nuevo Tablero. */
	.navbar-nav .enlace-tablero {
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.25);
	}

	.navbar-nav .enlace-tablero:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.menu-group {
		position: relative;
		flex: 0 0 auto;
	}

	.menu-group summary {
		list-style: none;
	}

	.menu-group summary::-webkit-details-marker {
		display: none;
	}

	.menu-group summary::after {
		content: ' ▾';
		font-size: 0.75rem;
	}

	.dropdown-menu-custom {
		position: absolute;
		top: calc(100% + 5px);
		left: 0;
		z-index: 1050;
		min-width: 210px;
		max-width: calc(100vw - 24px);
		padding: 8px;
		border: 1px solid #e5edf5;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 8px 24px rgba(28, 55, 90, 0.16);
	}

	.dropdown-menu-custom a {
		display: block;
		padding: 10px 12px;
		border-radius: 8px;
		color: #344054;
		font-size: 0.94rem;
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.dropdown-menu-custom a:hover {
		background: #e6f7f4;
		color: #087f70;
	}

	.dropdown-right {
		right: 0;
		left: auto;
	}

	.user-menu {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		flex: 0 1 auto;
		min-width: 0;
		max-width: 100%;
		margin-left: 8px;
		padding-left: 10px;
		border-left: 1px solid rgba(255, 255, 255, 0.3);
	}

	.user-info {
		display: flex;
		flex: 0 1 140px;
		flex-direction: column;
		min-width: 0;
		max-width: 140px;
		color: #fff;
		font-size: 0.73rem;
	}

	.user-info strong,
	.user-info span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-info span {
		opacity: 0.85;
	}

	.btn-logout {
		flex: 0 0 auto;
		padding: 8px 10px;
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: 9px;
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		font-size: 0.83rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.btn-logout:hover {
		background: #fff;
		color: #1769aa;
	}

	.nav-status {
		padding: 8px;
		color: #fff;
		font-size: 0.8rem;
	}

	@media (max-width: 1350px) {
		.navbar-container {
			gap: 6px;
			padding-right: 10px;
			padding-left: 10px;
		}

		.navbar-brand {
			gap: 5px;
			font-size: 0.94rem;
		}

		.brand-icon {
			flex-basis: 36px;
			width: 36px;
			height: 36px;
		}

		.navbar-nav .nav-link {
			padding: 8px 5px;
			font-size: 0.76rem;
		}

		.user-menu {
			gap: 5px;
			margin-left: 3px;
			padding-left: 6px;
		}

		.user-info {
			flex-basis: 100px;
			max-width: 100px;
		}

		.btn-logout {
			padding: 7px;
			font-size: 0.75rem;
		}
	}

	@media (max-width: 1100px) {
		.navbar-container {
			flex-wrap: wrap;
		}

		.navbar-toggler {
			display: block;
			margin-left: auto;
		}

		.navbar-collapse {
			flex-basis: 100%;
			width: 100%;
		}

		.navbar-nav {
			align-items: stretch;
			width: 100%;
			padding-top: 10px;
		}

		.navbar-nav .nav-link {
			padding: 10px 12px;
			font-size: 0.9rem;
		}

		.menu-group {
			width: 100%;
		}

		.dropdown-menu-custom {
			position: static;
			width: 100%;
			max-width: 100%;
			margin: 4px 0 10px;
			box-shadow: none;
		}

		.user-menu {
			width: 100%;
			justify-content: flex-start;
			margin: 10px 0 0;
			padding: 12px 0 0;
			border-top: 1px solid rgba(255, 255, 255, 0.3);
			border-left: none;
		}

		.user-info {
			flex: 1 1 auto;
			max-width: 260px;
		}
	}

	@media (max-width: 480px) {
		.navbar-container {
			padding-right: 10px;
			padding-left: 10px;
		}

		.navbar-brand {
			font-size: 0.9rem;
		}

		.brand-icon {
			flex-basis: 34px;
			width: 34px;
			height: 34px;
		}

		.user-info {
			max-width: calc(100vw - 130px);
		}
	}
</style>
