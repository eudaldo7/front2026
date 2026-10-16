
<svelte:head>
	<title>Administración</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';

	let estadoAPI = 'Consultando...';
	let claseAPI = 'text-bg-secondary';

	let cargando = true;
	let fechaConsulta = '';

	async function consultarEstado() {
		cargando = true;
		estadoAPI = 'Consultando...';
		claseAPI = 'text-bg-secondary';

		try {
			const respuesta = await fetch(`${API_URL}/`);

			if (!respuesta.ok) {
				throw new Error('La API respondió con un error.');
			}

			const datos = await respuesta.json();

			estadoAPI = datos.mensaje ?? 'API disponible';
			claseAPI = 'text-bg-success';
		} catch {
			estadoAPI = 'No disponible';
			claseAPI = 'text-bg-danger';
		} finally {
			fechaConsulta = new Date().toLocaleString('es-CO');
			cargando = false;
		}
	}

	onMount(consultarEstado);
</script>

<div class="container mt-4">
	<div class="mb-4">
		<h2>Administración</h2>
		<p class="text-muted">
			Configuración general y control de los elementos del sistema.
		</p>
	</div>

	<!-- Opciones de administración -->
	<div class="row g-4 mb-4">
		<div class="col-md-4">
			<div class="card shadow-sm h-100">
				<div class="card-body">
					<h5>Usuarios</h5>
					<p class="text-muted">
						Administrar los usuarios registrados en el sistema.
					</p>
					<a href="/usuarios" class="btn btn-outline-primary">
						Administrar usuarios
					</a>
				</div>
			</div>
		</div>

		<div class="col-md-4">
			<div class="card shadow-sm h-100">
				<div class="card-body">
					<h5>Roles</h5>
					<p class="text-muted">
						Administrar los roles y sus responsabilidades.
					</p>
					<a href="/roles" class="btn btn-outline-primary">
						Administrar roles
					</a>
				</div>
			</div>
		</div>

		<div class="col-md-4">
			<div class="card shadow-sm h-100">
				<div class="card-body">
					<h5>Módulos</h5>
					<p class="text-muted">
						Consultar los módulos y su relación con los roles.
					</p>
					<a href="/modulos" class="btn btn-outline-primary">
						Administrar módulos
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Estado del sistema -->
	<div class="card shadow-sm mb-4">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Estado del sistema</strong>

			<button
				class="btn btn-sm btn-outline-primary"
				onclick={consultarEstado}
				disabled={cargando}
			>
				{cargando ? 'Consultando...' : 'Verificar API'}
			</button>
		</div>

		<div class="card-body">
			<div class="row g-4">
				<div class="col-md-4">
					<div class="d-flex justify-content-between align-items-center">
						<span>API del sistema</span>
						<span class="badge {claseAPI}">
							{cargando ? 'Consultando...' : estadoAPI}
						</span>
					</div>
				</div>

				<div class="col-md-4">
					<div class="d-flex justify-content-between align-items-center">
						<span>Base de datos</span>
						<span class="badge text-bg-secondary">
							No verificada
						</span>
					</div>
					<small class="text-muted">
						Requiere una comprobación específica de la conexión.
					</small>
				</div>

				<div class="col-md-4">
					<div class="d-flex justify-content-between align-items-center">
						<span>Motor de riesgo</span>
						<span class="badge text-bg-secondary">
							Pendiente de verificar
						</span>
					</div>
				</div>
			</div>

			{#if fechaConsulta}
				<p class="text-muted small mt-3 mb-0">
					Última consulta: {fechaConsulta}
				</p>
			{/if}
		</div>
	</div>

	<!-- Acciones administrativas -->
	<div class="card shadow-sm">
		<div class="card-header">
			<strong>Acciones administrativas</strong>
		</div>

		<div class="card-body">
			<div class="d-flex gap-2 flex-wrap">
				<a href="/roles" class="btn btn-primary">
					Administrar permisos
				</a>

				<a href="/reportes" class="btn btn-outline-secondary">
					Consultar reportes
				</a>

				<a href="/usuarios" class="btn btn-outline-secondary">
					Consultar usuarios
				</a>
			</div>

			<p class="text-muted small mt-3 mb-0">
				Las acciones de modificación de permisos y desactivación de usuarios
				deben ejecutarse mediante las funciones autorizadas del backend.
			</p>
		</div>
	</div>
</div>

