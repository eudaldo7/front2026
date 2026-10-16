
<svelte:head>
	<title>Casos</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Caso {
		id_caso: number;
		id_estudiante: number;
		id_usuario_responsable: number;
		fecha_apertura: string;
		estado?: boolean;
		nombre_estudiante?: string;
		apellido_estudiante?: string;
		nombre_responsable?: string;
		apellido_responsable?: string;
	}

	interface Estudiante {
		id_estudiante: number;
		nombre: string;
		apellido: string;
	}

	interface Usuario {
		id_usuario: number;
		nombre: string;
		apellido: string;
		id_rol?: number;
	}

	let casos: Caso[] = [];
	let estudiantes: Estudiante[] = [];
	let usuarios: Usuario[] = [];

	let idEstudiante = '';
	let idResponsable = '';
	let fechaApertura = new Date().toISOString().slice(0, 10);

	let mostrarFormulario = false;
	let cargando = false;
	let guardando = false;
	let error = '';
	let mensaje = '';

	function nombreEstudiante(caso: Caso) {
		if (caso.nombre_estudiante || caso.apellido_estudiante) {
			return `${caso.nombre_estudiante ?? ''} ${caso.apellido_estudiante ?? ''}`.trim();
		}

		const estudiante = estudiantes.find(
			(e) => e.id_estudiante === caso.id_estudiante
		);

		return estudiante
			? `${estudiante.nombre} ${estudiante.apellido}`
			: `Estudiante #${caso.id_estudiante}`;
	}

	function nombreResponsable(caso: Caso) {
		if (caso.nombre_responsable || caso.apellido_responsable) {
			return `${caso.nombre_responsable ?? ''} ${caso.apellido_responsable ?? ''}`.trim();
		}

		const usuario = usuarios.find(
			(u) => u.id_usuario === caso.id_usuario_responsable
		);

		return usuario
			? `${usuario.nombre} ${usuario.apellido}`
			: `Usuario #${caso.id_usuario_responsable}`;
	}

	function formatearFecha(fecha: string) {
		if (!fecha) return 'Sin fecha';

		const partes = fecha.slice(0, 10).split('-');

		return partes.length === 3
			? `${partes[2]}/${partes[1]}/${partes[0]}`
			: fecha;
	}

	function estadoCaso(caso: Caso) {
		// El repositorio actual maneja un campo booleano estado.
		return caso.estado === false ? 'Inactivo' : 'Activo';
	}

	function claseEstado(caso: Caso) {
		return caso.estado === false
			? 'text-bg-secondary'
			: 'text-bg-warning';
	}

	async function cargarDatos() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			const [respuestaCasos, respuestaEstudiantes, respuestaUsuarios] =
				await Promise.all([
					fetch(`${API_URL}/casos/?id_usuario=${ID_USUARIO}`),
					fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`),
					fetch(`${API_URL}/usuarios/?id_usuario=${ID_USUARIO}`)
				]);

			if (!respuestaCasos.ok) {
				throw new Error('No se pudieron consultar los casos.');
			}

			if (!respuestaEstudiantes.ok) {
				throw new Error('No se pudo consultar la lista de estudiantes.');
			}

			if (!respuestaUsuarios.ok) {
				throw new Error('No se pudo consultar la lista de responsables.');
			}

			const datosCasos = await respuestaCasos.json();
			const datosEstudiantes = await respuestaEstudiantes.json();
			const datosUsuarios = await respuestaUsuarios.json();

			casos = Array.isArray(datosCasos) ? datosCasos : [];
			estudiantes = Array.isArray(datosEstudiantes)
				? datosEstudiantes
				: [];
			usuarios = Array.isArray(datosUsuarios) ? datosUsuarios : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar la información.';
		} finally {
			cargando = false;
		}
	}

	async function abrirCaso() {
		error = '';
		mensaje = '';

		if (!idEstudiante || !idResponsable || !fechaApertura) {
			error = 'Completa todos los campos para abrir el caso.';
			return;
		}

		guardando = true;

		try {
			const respuesta = await fetch(
				`${API_URL}/casos/?id_usuario=${ID_USUARIO}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						id_estudiante: Number(idEstudiante),
						id_usuario_responsable: Number(idResponsable),
						fecha_apertura: fechaApertura
					})
				}
			);

			const datos = await respuesta.json().catch(() => null);

			if (!respuesta.ok) {
				throw new Error(
					datos?.detail ?? 'No se pudo abrir el caso.'
				);
			}

			mensaje = 'Caso registrado correctamente.';
			mostrarFormulario = false;
			idEstudiante = '';
			idResponsable = '';
			fechaApertura = new Date().toISOString().slice(0, 10);

			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al registrar el caso.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarDatos);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Casos</h2>
			<p class="text-muted">
				Administración de casos que requieren acompañamiento escolar.
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
			{mostrarFormulario ? 'Cancelar' : '+ Abrir caso'}
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
				<strong>Registrar nuevo caso</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						abrirCaso();
					}}
				>
					<div class="row g-3">
						<div class="col-md-4">
							<label for="estudiante" class="form-label">
								Estudiante
							</label>

							<select
								id="estudiante"
								class="form-select"
								bind:value={idEstudiante}
								required
							>
								<option value="">Selecciona un estudiante</option>

								{#each estudiantes as estudiante}
									<option value={String(estudiante.id_estudiante)}>
										{estudiante.nombre} {estudiante.apellido}
									</option>
								{/each}
							</select>
						</div>

						<div class="col-md-4">
							<label for="responsable" class="form-label">
								Usuario responsable
							</label>

							<select
								id="responsable"
								class="form-select"
								bind:value={idResponsable}
								required
							>
								<option value="">Selecciona un responsable</option>

								{#each usuarios as usuario}
									<option value={String(usuario.id_usuario)}>
										{usuario.nombre} {usuario.apellido}
									</option>
								{/each}
							</select>
						</div>

						<div class="col-md-4">
							<label for="fecha" class="form-label">
								Fecha de apertura
							</label>

							<input
								id="fecha"
								type="date"
								class="form-control"
								bind:value={fechaApertura}
								required
							/>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando ||
									estudiantes.length === 0 ||
									usuarios.length === 0}
							>
								{guardando ? 'Guardando...' : 'Guardar caso'}
							</button>
						</div>
					</div>
				</form>

				<div class="form-text mt-3">
					El responsable debe ser un usuario válido y el estudiante debe
					estar activo en el sistema.
				</div>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Casos de acompañamiento</strong>

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
					<p class="text-muted mt-2">Consultando casos...</p>
				</div>
			{:else if casos.length === 0}
				<div class="alert alert-info mb-0">
					No hay casos registrados para mostrar.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Estudiante</th>
								<th>Responsable</th>
								<th>Fecha de apertura</th>
								<th>Estado</th>
							</tr>
						</thead>

						<tbody>
							{#each casos as caso (caso.id_caso)}
								<tr>
									<td>{caso.id_caso}</td>
									<td>{nombreEstudiante(caso)}</td>
									<td>{nombreResponsable(caso)}</td>
									<td>{formatearFecha(caso.fecha_apertura)}</td>
									<td>
										<span class="badge {claseEstado(caso)}">
											{estadoCaso(caso)}
										</span>
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
