
<svelte:head>
	<title>Usuarios</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Usuario {
		id_usuario: number;
		nombre: string;
		apellido: string;
		correo: string;
		id_rol: number;
		estado?: boolean;
	}

	interface Rol {
		id_rol: number;
		nombre: string;
	}

	let usuarios: Usuario[] = [];
	let roles: Rol[] = [];

	let nombre = '';
	let apellido = '';
	let correo = '';
	let contrasena = '';
	let idRol = '';

	let mostrarFormulario = false;
	let cargando = false;
	let guardando = false;
	let error = '';
	let mensaje = '';

	function nombreRol(id: number) {
		const rol = roles.find((r) => r.id_rol === id);
		return rol?.nombre ?? `Rol #${id}`;
	}

	async function cargarDatos() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			const [respuestaUsuarios, respuestaRoles] = await Promise.all([
				fetch(`${API_URL}/usuarios/?id_usuario=${ID_USUARIO}`),
				fetch(`${API_URL}/roles/?id_usuario=${ID_USUARIO}`)
			]);

			if (!respuestaUsuarios.ok) {
				throw new Error('No se pudieron consultar los usuarios.');
			}

			if (!respuestaRoles.ok) {
				throw new Error('No se pudieron consultar los roles.');
			}

			const datosUsuarios = await respuestaUsuarios.json();
			const datosRoles = await respuestaRoles.json();

			usuarios = Array.isArray(datosUsuarios) ? datosUsuarios : [];
			roles = Array.isArray(datosRoles) ? datosRoles : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar los datos.';
		} finally {
			cargando = false;
		}
	}

	async function crearUsuario() {
		error = '';
		mensaje = '';

		if (
			!nombre.trim() ||
			!apellido.trim() ||
			!correo.trim() ||
			!contrasena ||
			!idRol
		) {
			error = 'Completa todos los campos antes de guardar.';
			return;
		}

		guardando = true;

		try {
			const respuesta = await fetch(
				`${API_URL}/usuarios/?id_usuario=${ID_USUARIO}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						nombre: nombre.trim(),
						apellido: apellido.trim(),
						correo: correo.trim(),
						contraseña: contrasena,
						id_rol: Number(idRol)
					})
				}
			);

			const datos = await respuesta.json().catch(() => null);

			if (!respuesta.ok) {
				throw new Error(
					datos?.detail ?? 'No se pudo registrar el usuario.'
				);
			}

			mensaje = 'Usuario registrado correctamente.';
			nombre = '';
			apellido = '';
			correo = '';
			contrasena = '';
			idRol = '';
			mostrarFormulario = false;

			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al registrar el usuario.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarDatos);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Usuarios</h2>
			<p class="text-muted">
				Administración de usuarios y responsables del sistema.
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
			{mostrarFormulario ? 'Cancelar' : '+ Nuevo usuario'}
		</button>
	</div>

	{#if mensaje}
		<div class="alert alert-success" role="alert">{mensaje}</div>
	{/if}

	{#if error}
		<div class="alert alert-danger" role="alert">
			{error}
			<button class="btn btn-sm btn-outline-danger ms-2" onclick={cargarDatos}>
				Reintentar
			</button>
		</div>
	{/if}

	{#if mostrarFormulario}
		<div class="card shadow-sm mb-4">
			<div class="card-header">
				<strong>Registrar nuevo usuario</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						crearUsuario();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="nombre" class="form-label">Nombre</label>
							<input
								id="nombre"
								class="form-control"
								bind:value={nombre}
								maxlength="100"
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="apellido" class="form-label">Apellido</label>
							<input
								id="apellido"
								class="form-control"
								bind:value={apellido}
								maxlength="100"
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="correo" class="form-label">Correo electrónico</label>
							<input
								id="correo"
								type="email"
								class="form-control"
								bind:value={correo}
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="contrasena" class="form-label">Contraseña</label>
							<input
								id="contrasena"
								type="password"
								class="form-control"
								bind:value={contrasena}
								minlength="8"
								autocomplete="new-password"
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="rol" class="form-label">Rol</label>
							<select
								id="rol"
								class="form-select"
								bind:value={idRol}
								required
							>
								<option value="">Selecciona un rol</option>

								{#each roles as rol}
									<option value={String(rol.id_rol)}>
										{rol.nombre}
									</option>
								{/each}
							</select>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando || roles.length === 0}
							>
								{guardando ? 'Guardando...' : 'Guardar usuario'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Listado de usuarios</strong>

			<button
				class="btn btn-sm btn-outline-primary"
				onclick={cargarDatos}
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
					<p class="text-muted mt-2">Consultando usuarios...</p>
				</div>
			{:else if usuarios.length === 0}
				<div class="alert alert-info mb-0">
					No hay usuarios registrados para mostrar.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Nombre</th>
								<th>Apellido</th>
								<th>Correo</th>
								<th>Rol</th>
								<th>Estado</th>
							</tr>
						</thead>

						<tbody>
							{#each usuarios as usuario (usuario.id_usuario)}
								<tr>
									<td>{usuario.id_usuario}</td>
									<td>{usuario.nombre}</td>
									<td>{usuario.apellido}</td>
									<td>{usuario.correo}</td>
									<td>{nombreRol(usuario.id_rol)}</td>
									<td>
										{#if usuario.estado === false}
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

