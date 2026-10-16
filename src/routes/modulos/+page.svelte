
<svelte:head>
	<title>Módulos</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Modulo {
		id_modulo: number;
		nombre: string;
		descripcion?: string;
		estado?: boolean;
	}

	let modulos: Modulo[] = [];
	let nombre = '';
	let descripcion = '';

	let mostrarFormulario = false;
	let cargando = false;
	let guardando = false;
	let error = '';
	let mensaje = '';

	async function cargarModulos() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			// Consultar los módulos disponibles para los roles.
			const respuesta = await fetch(
				`${API_URL}/roles/1/modulos?id_usuario=${ID_USUARIO}`
			);

			if (!respuesta.ok) {
				throw new Error(
					'No se pudieron consultar los módulos. Verifica la ruta de la API.'
				);
			}

			const datos = await respuesta.json();

			// La ruta de módulos por rol puede devolver una estructura distinta.
			// Si la respuesta no es una lista, no inventamos registros.
			modulos = Array.isArray(datos) ? datos : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar los módulos.';
		} finally {
			cargando = false;
		}
	}

	async function crearModulo() {
		error = '';
		mensaje = '';

		if (!nombre.trim()) {
			error = 'Escribe el nombre del módulo.';
			return;
		}

		guardando = true;

		try {
			/*
			 * Esta operación requiere una ruta POST específica para módulos.
			 * No se envía la petición hasta confirmar que existe en el backend.
			 */
			error =
				'La creación de módulos requiere confirmar primero la ruta POST correspondiente en el backend.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarModulos);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Módulos</h2>
			<p class="text-muted">
				Administración de los módulos disponibles en el sistema.
			</p>
		</div>

		<button
			class="btn btn-primary"
			onclick={() => {
				mostrarFormulario = !mostrarFormulario;
				error = '';
				mensaje = '';
			}}
		>
			{mostrarFormulario ? 'Cancelar' : '+ Nuevo módulo'}
		</button>
	</div>

	{#if mensaje}
		<div class="alert alert-success" role="alert">{mensaje}</div>
	{/if}

	{#if error}
		<div class="alert alert-warning" role="alert">{error}</div>
	{/if}

	{#if mostrarFormulario}
		<div class="card shadow-sm mb-4">
			<div class="card-header">
				<strong>Registrar módulo</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						crearModulo();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="nombre" class="form-label">
								Nombre del módulo
							</label>

							<input
								id="nombre"
								class="form-control"
								bind:value={nombre}
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="descripcion" class="form-label">
								Descripción
							</label>

							<input
								id="descripcion"
								class="form-control"
								bind:value={descripcion}
								placeholder="Descripción del módulo"
							/>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando}
							>
								Guardar módulo
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Módulos del sistema</strong>

			<button
				class="btn btn-sm btn-outline-primary"
				onclick={cargarModulos}
				disabled={cargando}
			>
				{cargando ? 'Cargando...' : 'Actualizar'}
			</button>
		</div>

		<div class="card-body">
			{#if cargando}
				<div class="text-center py-4">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Cargando...</span>
					</div>
					<p class="text-muted mt-2">Consultando módulos...</p>
				</div>
			{:else if modulos.length === 0 && !error}
				<div class="alert alert-info mb-0">
					La API no devolvió una lista de módulos para mostrar.
					Debemos confirmar el formato de respuesta del backend.
				</div>
			{:else if modulos.length > 0}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Módulo</th>
								<th>Descripción</th>
								<th>Estado</th>
							</tr>
						</thead>

						<tbody>
							{#each modulos as modulo (modulo.id_modulo)}
								<tr>
									<td>{modulo.id_modulo}</td>
									<td>{modulo.nombre}</td>
									<td>{modulo.descripcion || 'Sin descripción'}</td>
									<td>
										{#if modulo.estado === false}
											<span class="badge text-bg-secondary">Inactivo</span>
										{:else}
											<span class="badge text-bg-success">Activo</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

