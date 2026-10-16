
<svelte:head>
	<title>Roles</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Rol {
		id_rol: number;
		nombre: string;
		descripcion?: string;
		estado?: boolean;
	}

	let roles: Rol[] = [];
	let nombre = '';
	let descripcion = '';

	let mostrarFormulario = false;
	let cargando = false;
	let guardando = false;
	let error = '';
	let mensaje = '';

	async function cargarRoles() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			const respuesta = await fetch(
				`${API_URL}/roles/?id_usuario=${ID_USUARIO}`
			);

			if (!respuesta.ok) {
				throw new Error('No se pudieron consultar los roles.');
			}

			const datos = await respuesta.json();
			roles = Array.isArray(datos) ? datos : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar los roles.';
		} finally {
			cargando = false;
		}
	}

	async function crearRol() {
		error = '';
		mensaje = '';

		if (!nombre.trim()) {
			error = 'Escribe el nombre del rol.';
			return;
		}

		guardando = true;

		try {
			const respuesta = await fetch(
				`${API_URL}/roles/?id_usuario=${ID_USUARIO}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						nombre: nombre.trim(),
						descripcion: descripcion.trim()
					})
				}
			);

			const datos = await respuesta.json().catch(() => null);

			if (!respuesta.ok) {
				throw new Error(
					datos?.detail ?? 'No se pudo registrar el rol.'
				);
			}

			nombre = '';
			descripcion = '';
			mostrarFormulario = false;
			mensaje = 'Rol registrado correctamente.';

			await cargarRoles();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al registrar el rol.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarRoles);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Roles</h2>
			<p class="text-muted">
				Administración de los roles del sistema.
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
			{mostrarFormulario ? 'Cancelar' : '+ Nuevo rol'}
		</button>
	</div>

	{#if mensaje}
		<div class="alert alert-success" role="alert">{mensaje}</div>
	{/if}

	{#if error}
		<div class="alert alert-danger" role="alert">
			{error}
			<button class="btn btn-sm btn-outline-danger ms-2" onclick={cargarRoles}>
				Reintentar
			</button>
		</div>
	{/if}

	{#if mostrarFormulario}
		<div class="card shadow-sm mb-4">
			<div class="card-header">
				<strong>Registrar nuevo rol</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						crearRol();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="nombre" class="form-label">
								Nombre del rol
							</label>

							<input
								id="nombre"
								class="form-control"
								bind:value={nombre}
								maxlength="100"
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
								maxlength="250"
								placeholder="Funciones principales del rol"
							/>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando}
							>
								{guardando ? 'Guardando...' : 'Guardar rol'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Listado de roles</strong>

			<button
				class="btn btn-sm btn-outline-primary"
				onclick={cargarRoles}
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
					<p class="text-muted mt-2">Consultando roles...</p>
				</div>
			{:else if roles.length === 0}
				<div class="alert alert-info mb-0">
					No hay roles registrados para mostrar.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Nombre del rol</th>
								<th>Descripción</th>
								<th>Estado</th>
							</tr>
						</thead>

						<tbody>
							{#each roles as rol (rol.id_rol)}
								<tr>
									<td>{rol.id_rol}</td>
									<td>{rol.nombre}</td>
									<td>{rol.descripcion || 'Sin descripción'}</td>
									<td>
										{#if rol.estado === false}
											<span class="badge text-bg-secondary">
												Inactivo
											</span>
										{:else}
											<span class="badge text-bg-success">
												Activo
											</span>
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

