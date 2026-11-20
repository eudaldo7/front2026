
<svelte:head>
	<title>Gestión de Estudiantes | Alerta Temprana</title>
	<meta
		name="description"
		content="Registro, consulta y administración de estudiantes."
	/>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

	interface Estudiante {
		id_estudiante: number;
		nombre: string;
		apellido: string;
		documento: string;
		curso: string;
		estado?: boolean;
	}

	interface Usuario {
		id_usuario: number;
		nombre?: string;
		apellido?: string;
		correo?: string;
		id_rol?: number;
		rol?: string;
	}

	let estudiantes = $state<Estudiante[]>([]);
	let usuario = $state<Usuario | null>(null);

	let nombre = $state('');
	let apellido = $state('');
	let documento = $state('');
	let curso = $state('');
	let busqueda = $state('');

	let cargando = $state(false);
	let guardando = $state(false);
	let mostrandoFormulario = $state(false);
	let error = $state('');
	let mensaje = $state('');

	let idEditando = $state<number | null>(null);
	let estudianteEliminando = $state<number | null>(null);
	let estudianteSeleccionado = $state<Estudiante | null>(null);

	const estudiantesFiltrados = $derived(
		estudiantes.filter((estudiante) => {
			const texto = busqueda.trim().toLowerCase();

			if (!texto) return true;

			return [
				estudiante.nombre,
				estudiante.apellido,
				estudiante.documento,
				estudiante.curso,
				String(estudiante.id_estudiante)
			].some((valor) => (valor ?? '').toLowerCase().includes(texto));
		})
	);

	function obtenerToken(): string | null {
		return localStorage.getItem('tokenAcceso');
	}

	function obtenerUsuario(): Usuario | null {
		const guardado = localStorage.getItem('usuarioSesion');

		if (!guardado) return null;

		try {
			const datos = JSON.parse(guardado);
			const id = Number(datos?.id_usuario);

			if (!Number.isInteger(id) || id <= 0) return null;

			return { ...datos, id_usuario: id } as Usuario;
		} catch {
			return null;
		}
	}

	function cerrarSesion(): void {
		localStorage.removeItem('tokenAcceso');
		localStorage.removeItem('usuarioSesion');
		window.location.href = '/';
	}

	async function solicitarAPI<T>(
		ruta: string,
		opciones: RequestInit = {}
	): Promise<T> {
		const token = obtenerToken();

		if (!token) {
			cerrarSesion();
			throw new Error('Tu sesión ha finalizado. Inicia sesión nuevamente.');
		}

		const respuesta = await fetch(`${API_URL}${ruta}`, {
			...opciones,
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				...(opciones.body
					? { 'Content-Type': 'application/json' }
					: {}),
				...opciones.headers
			}
		});

		if (respuesta.status === 401) {
			cerrarSesion();
			throw new Error('Tu sesión ha vencido. Inicia sesión nuevamente.');
		}

		const datos = await respuesta.json().catch(() => null);

		if (!respuesta.ok) {
			const detalle = datos?.detail;

			throw new Error(
				typeof detalle === 'string'
					? detalle
					: `La operación falló. Código HTTP: ${respuesta.status}.`
			);
		}

		return datos as T;
	}

	async function cargarEstudiantes(): Promise<void> {
		cargando = true;
		error = '';

		try {
			const datos = await solicitarAPI<Estudiante[]>(
				`/estudiantes/?id_usuario=${usuario?.id_usuario}`
			);

			estudiantes = Array.isArray(datos) ? datos : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'No se pudieron cargar los estudiantes.';
		} finally {
			cargando = false;
		}
	}

	function limpiarFormulario(): void {
		nombre = '';
		apellido = '';
		documento = '';
		curso = '';
		idEditando = null;
		mostrandoFormulario = false;
	}

	function nuevoEstudiante(): void {
		limpiarFormulario();
		estudianteSeleccionado = null;
		error = '';
		mensaje = '';
		mostrandoFormulario = true;
	}

	function editarEstudiante(estudiante: Estudiante): void {
		error = '';
		mensaje = '';
		estudianteSeleccionado = null;

		idEditando = estudiante.id_estudiante;
		nombre = estudiante.nombre;
		apellido = estudiante.apellido;
		documento = estudiante.documento;
		curso = estudiante.curso;

		mostrandoFormulario = true;
	}

	function verEstudiante(estudiante: Estudiante): void {
		estudianteSeleccionado = estudiante;
		mostrandoFormulario = false;
	}

	async function guardarEstudiante(): Promise<void> {
		error = '';
		mensaje = '';

		if (
			!nombre.trim() ||
			!apellido.trim() ||
			!documento.trim() ||
			!curso.trim()
		) {
			error = 'Completa todos los campos antes de guardar.';
			return;
		}

		guardando = true;

		try {
			const editando = idEditando !== null;

			const ruta = editando
				? `/estudiantes/${idEditando}?id_usuario=${usuario?.id_usuario}`
				: `/estudiantes/?id_usuario=${usuario?.id_usuario}`;

			await solicitarAPI(ruta, {
				method: editando ? 'PUT' : 'POST',
				body: JSON.stringify({
					nombre: nombre.trim(),
					apellido: apellido.trim(),
					documento: documento.trim(),
					curso: curso.trim()
				})
			});

			mensaje = editando
				? 'Estudiante actualizado correctamente.'
				: 'Estudiante registrado correctamente.';

			limpiarFormulario();
			await cargarEstudiantes();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'No fue posible guardar el estudiante.';
		} finally {
			guardando = false;
		}
	}

	async function eliminarEstudiante(
		estudiante: Estudiante
	): Promise<void> {
		const confirmar = window.confirm(
			`¿Deseas eliminar al estudiante ${estudiante.nombre} ${estudiante.apellido}?`
		);

		if (!confirmar) return;

		error = '';
		mensaje = '';
		estudianteEliminando = estudiante.id_estudiante;

		try {
			await solicitarAPI(
				`/estudiantes/${estudiante.id_estudiante}?id_usuario=${usuario?.id_usuario}`,
				{ method: 'DELETE' }
			);

			mensaje = 'Estudiante eliminado correctamente.';
			await cargarEstudiantes();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'No fue posible eliminar el estudiante.';
		} finally {
			estudianteEliminando = null;
		}
	}

	function estadoEstudiante(estudiante: Estudiante): string {
		return estudiante.estado === false ? 'Inactivo' : 'Activo';
	}

	onMount(() => {
		usuario = obtenerUsuario();

		if (!usuario || !obtenerToken()) {
			cerrarSesion();
			return;
		}

		void cargarEstudiantes();
	});
</script>

<div class="container mt-4 mb-5 pagina-estudiantes">
	<div
		class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"
	>
		<div>
			<PageTitle
				titulo="Gestión de Estudiantes"
				subtitulo="Registro y seguimiento de estudiantes."
			/>
		</div>

		<button class="btn btn-primary" onclick={nuevoEstudiante}>
			+ Nuevo estudiante
		</button>
	</div>

	{#if mensaje}
		<div class="alert alert-success" role="status">
			{mensaje}
			<button
				class="btn-close float-end"
				aria-label="Cerrar mensaje"
				onclick={() => (mensaje = '')}
			></button>
		</div>
	{/if}

	{#if error}
		<div class="alert alert-danger" role="alert">
			{error}
			<button
				class="btn btn-sm btn-outline-danger ms-2"
				onclick={() => void cargarEstudiantes()}
				disabled={cargando}
			>
				Reintentar
			</button>
		</div>
	{/if}

	{#if estudianteSeleccionado}
		<div class="card panel mb-4">
			<div
				class="card-header cabecera-panel d-flex justify-content-between align-items-center"
			>
				<strong>Información del estudiante</strong>
				<button
					class="btn-close"
					aria-label="Cerrar"
					onclick={() => (estudianteSeleccionado = null)}
				></button>
			</div>

			<div class="card-body">
				<div class="row g-3">
					<div class="col-md-6">
						<strong>ID:</strong>
						<p>{estudianteSeleccionado.id_estudiante}</p>
					</div>

					<div class="col-md-6">
						<strong>Nombre completo:</strong>
						<p>
							{estudianteSeleccionado.nombre}
							{estudianteSeleccionado.apellido}
						</p>
					</div>

					<div class="col-md-6">
						<strong>Documento:</strong>
						<p>{estudianteSeleccionado.documento}</p>
					</div>

					<div class="col-md-6">
						<strong>Curso:</strong>
						<p>{estudianteSeleccionado.curso}</p>
					</div>

					<div class="col-md-6">
						<strong>Estado:</strong>
						<p>
							<StatusBadge
								texto={estadoEstudiante(estudianteSeleccionado)}
								estado={estudianteSeleccionado.estado === false ? 'inactivo' : 'activo'}
							/>
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if mostrandoFormulario}
		<div class="card panel mb-4">
			<div class="card-header cabecera-panel">
				<strong>
					{idEditando === null
						? 'Registrar estudiante'
						: `Editar estudiante #${idEditando}`}
				</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						void guardarEstudiante();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="nombre" class="form-label">Nombre</label>
							<input
								id="nombre"
								type="text"
								class="form-control"
								bind:value={nombre}
								maxlength="50"
								autocomplete="given-name"
								required
								disabled={guardando}
							/>
						</div>

						<div class="col-md-6">
							<label for="apellido" class="form-label">Apellido</label>
							<input
								id="apellido"
								type="text"
								class="form-control"
								bind:value={apellido}
								maxlength="50"
								autocomplete="family-name"
								required
								disabled={guardando}
							/>
						</div>

						<div class="col-md-6">
							<label for="documento" class="form-label">
								Documento
							</label>
							<input
								id="documento"
								type="text"
								class="form-control"
								bind:value={documento}
								maxlength="50"
								required
								disabled={guardando}
							/>
						</div>

						<div class="col-md-6">
							<label for="curso" class="form-label">Curso</label>
							<input
								id="curso"
								type="text"
								class="form-control"
								bind:value={curso}
								maxlength="25"
								placeholder="Ejemplo: 10A"
								required
								disabled={guardando}
							/>
						</div>

						<div class="col-12 d-flex flex-wrap gap-2">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando}
							>
								{guardando
									? 'Guardando...'
									: idEditando === null
										? 'Guardar estudiante'
										: 'Guardar cambios'}
							</button>

							<button
								type="button"
								class="btn btn-outline-secondary"
								onclick={limpiarFormulario}
								disabled={guardando}
							>
								Cancelar
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card panel">
		<div
			class="card-header cabecera-listado d-flex flex-wrap justify-content-between align-items-center gap-3"
		>
			<strong>Listado de estudiantes</strong>

			<div class="acciones-listado">
				<SearchBar
					bind:valor={busqueda}
					placeholder="Buscar por nombre, documento o curso..."
					etiqueta="Buscar estudiantes"
					alBuscar={(valor) => (busqueda = valor)}
				/>

				<button
					class="btn btn-outline-primary"
					onclick={() => void cargarEstudiantes()}
					disabled={cargando}
				>
					{cargando ? 'Cargando...' : 'Actualizar'}
				</button>
			</div>
		</div>

		<div class="card-body">
			{#if cargando}
				<div class="text-center py-5">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Cargando...</span>
					</div>
					<p class="text-muted mt-2">Consultando estudiantes...</p>
				</div>
			{:else if estudiantesFiltrados.length === 0}
				<div class="alert alert-info mb-0">
					{estudiantes.length === 0
						? 'No hay estudiantes registrados para mostrar.'
						: 'No se encontraron estudiantes con esa búsqueda.'}
				</div>
			{:else}
				<DataTable
					columnas={[
						{ clave: 'nombre', titulo: 'Nombre' },
						{ clave: 'apellido', titulo: 'Apellido' },
						{ clave: 'documento', titulo: 'Documento' },
						{ clave: 'curso', titulo: 'Curso' },
						{ clave: 'estado', titulo: 'Estado' },
						{ clave: 'acciones', titulo: 'Acciones' }
					]}
					filas={estudiantesFiltrados.map((estudiante) => ({
						...estudiante,
						estado: estadoEstudiante(estudiante),
						estadoTipo: estudiante.estado === false ? 'inactivo' : 'activo'
					}))}
					claveFila="id_estudiante"
					mensajeVacio="No hay estudiantes registrados para mostrar."
				>
					{#snippet celdaPersonalizada(fila, clave)}
						{#if clave === 'estado'}
							<StatusBadge
								texto={String(fila.estado ?? 'Activo')}
								estado={fila.estadoTipo === 'inactivo' ? 'inactivo' : 'activo'}
							/>
						{:else}
							{fila[clave] == null ? '—' : String(fila[clave])}
						{/if}
					{/snippet}

					{#snippet acciones(fila)}
						{@const estudiante = estudiantesFiltrados.find(
							(item) => item.id_estudiante === fila.id_estudiante
						)}

						{#if estudiante}
							<div class="d-flex flex-wrap gap-2">
								<button
									class="btn btn-sm btn-outline-primary"
									onclick={() => verEstudiante(estudiante)}
								>
									Ver
								</button>

								<button
									class="btn btn-sm btn-outline-secondary"
									onclick={() => editarEstudiante(estudiante)}
								>
									Editar
								</button>

								<button
									class="btn btn-sm btn-outline-danger"
									onclick={() => void eliminarEstudiante(estudiante)}
									disabled={estudianteEliminando === estudiante.id_estudiante}
								>
									{estudianteEliminando === estudiante.id_estudiante
										? 'Eliminando...'
										: 'Eliminar'}
								</button>
							</div>
						{/if}
					{/snippet}
				</DataTable>

				<p class="text-muted small mb-0">
					Mostrando {estudiantesFiltrados.length} de {estudiantes.length}
					estudiantes.
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.pagina-estudiantes {
		max-width: 1500px;
		padding-bottom: 30px;
	}

	.panel {
		overflow: hidden;
		border: 0;
		border-radius: 14px;
		box-shadow: 0 5px 22px rgba(23, 50, 77, 0.08);
	}

	.cabecera-panel {
		padding: 16px 20px;
		background: #f0f6fc;
		color: #17324d;
	}

	.cabecera-listado {
		padding: 17px 20px;
		background: #fff;
		color: #17324d;
	}

	.acciones-listado {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.btn {
		border-radius: 8px;
	}

	@media (max-width: 576px) {
		.acciones-listado {
			width: 100%;
		}

		.acciones-listado button {
			width: 100%;
		}
	}
</style>
