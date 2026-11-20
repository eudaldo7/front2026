<svelte:head>
	<title>GestiÃ³n de Asistencias | Alerta Temprana</title>
	<meta
		name="description"
		content="Registro y seguimiento de la asistencia de los estudiantes."
	/>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
import DataTable from '$lib/components/DataTable.svelte';

	const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

	interface Asistencia {
		id_asistencia: number;
		id_estudiante: number;
		nombre?: string;
		apellido?: string;
		fecha: string;
		resultado: string;
		observacion?: string | null;
		estado?: boolean;
	}

	interface Estudiante {
		id_estudiante: number;
		nombre: string;
		apellido: string;
	}

	interface Usuario {
		id_usuario: number;
		nombre?: string;
		apellido?: string;
		rol?: string;
	}

	let asistencias = $state<Asistencia[]>([]);
	let estudiantes = $state<Estudiante[]>([]);
	let usuario = $state<Usuario | null>(null);

	let cargando = $state(false);
	let guardando = $state(false);
	let mostrarFormulario = $state(false);

	let error = $state('');
	let mensaje = $state('');
	let busqueda = $state('');

	let idEstudiante = $state('');
	let fecha = $state(new Date().toLocaleDateString('en-CA'));
	let resultado = $state('Presente');
	let observacion = $state('');

	let idEditando = $state<number | null>(null);
	let idEliminando = $state<number | null>(null);

	let asistenciasFiltradas = $derived(
		asistencias.filter((asistencia) => {
			const texto = busqueda.trim().toLowerCase();

			if (!texto) return true;

			return [
				String(asistencia.id_asistencia),
				nombreEstudiante(asistencia),
				asistencia.fecha,
				asistencia.resultado,
				asistencia.observacion ?? ''
			].some((valor) => valor.toLowerCase().includes(texto));
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
			throw new Error('La sesiÃ³n ha finalizado. Inicia sesiÃ³n nuevamente.');
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
			throw new Error('La sesiÃ³n ha vencido. Inicia sesiÃ³n nuevamente.');
		}

		const datos = await respuesta.json().catch(() => null);

		if (!respuesta.ok) {
			throw new Error(
				typeof datos?.detail === 'string'
					? datos.detail
					: `La solicitud fallÃ³. CÃ³digo HTTP: ${respuesta.status}.`
			);
		}

		return datos as T;
	}

	function nombreEstudiante(asistencia: Asistencia): string {
		if (asistencia.nombre || asistencia.apellido) {
			return `${asistencia.nombre ?? ''} ${asistencia.apellido ?? ''}`.trim();
		}

		const estudiante = estudiantes.find(
			(e) => e.id_estudiante === asistencia.id_estudiante
		);

		return estudiante
			? `${estudiante.nombre} ${estudiante.apellido}`
			: `Estudiante #${asistencia.id_estudiante}`;
	}

	function colorResultado(valor: string): string {
		const normalizado = valor.toLowerCase();

		if (normalizado.includes('presente')) return 'success';

		if (
			normalizado.includes('ausente') ||
			normalizado.includes('inasistencia')
		) {
			return 'danger';
		}

		if (normalizado.includes('tarde')) return 'warning';

		return 'secondary';
	}

	function formatearFecha(valor: string): string {
		if (!valor) return 'â€”';

		const partes = valor.slice(0, 10).split('-');

		return partes.length === 3
			? `${partes[2]}/${partes[1]}/${partes[0]}`
			: valor;
	}

	function limpiarFormulario(): void {
		idEstudiante = '';
		fecha = new Date().toLocaleDateString('en-CA');
		resultado = 'Presente';
		observacion = '';
		idEditando = null;
		mostrarFormulario = false;
	}

	async function cargarDatos(): Promise<void> {
		if (!usuario) return;

		cargando = true;
		error = '';

		try {
			const idUsuario = usuario.id_usuario;

			const [datosAsistencias, datosEstudiantes] = await Promise.all([
				solicitarAPI<Asistencia[]>(
					`/asistencias/?id_usuario=${idUsuario}`
				),
				solicitarAPI<Estudiante[]>(
					`/estudiantes/?id_usuario=${idUsuario}`
				)
			]);

			if (
				!Array.isArray(datosAsistencias) ||
				!Array.isArray(datosEstudiantes)
			) {
				throw new Error('La API devolviÃ³ un formato de datos inesperado.');
			}

			asistencias = datosAsistencias;
			estudiantes = datosEstudiantes;
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'OcurriÃ³ un error al cargar la informaciÃ³n.';
		} finally {
			cargando = false;
		}
	}

	function nuevaAsistencia(): void {
		limpiarFormulario();
		error = '';
		mensaje = '';
		mostrarFormulario = true;
	}

	function editarAsistencia(asistencia: Asistencia): void {
		error = '';
		mensaje = '';

		idEditando = asistencia.id_asistencia;
		idEstudiante = String(asistencia.id_estudiante);
		fecha = asistencia.fecha.slice(0, 10);
		resultado = asistencia.resultado;
		observacion = asistencia.observacion ?? '';

		mostrarFormulario = true;
	}

	async function guardarAsistencia(): Promise<void> {
		error = '';
		mensaje = '';

		if (!idEstudiante || !fecha || !resultado) {
			error = 'Selecciona un estudiante, una fecha y un resultado.';
			return;
		}

		if (!usuario) {
			error = 'No se encontrÃ³ la sesiÃ³n del usuario.';
			return;
		}

		guardando = true;

		try {
			const editando = idEditando !== null;
			const idUsuario = usuario.id_usuario;

			const ruta = editando
				? `/asistencias/${idEditando}?id_usuario=${idUsuario}`
				: `/asistencias/?id_usuario=${idUsuario}`;

			await solicitarAPI(ruta, {
				method: editando ? 'PUT' : 'POST',
				body: JSON.stringify({
					id_estudiante: Number(idEstudiante),
					fecha,
					resultado,
					observacion: observacion.trim() || null
				})
			});

			mensaje = editando
				? 'Asistencia actualizada correctamente.'
				: 'Asistencia registrada correctamente.';

			limpiarFormulario();
			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'OcurriÃ³ un error al guardar la asistencia.';
		} finally {
			guardando = false;
		}
	}

	async function eliminarAsistencia(asistencia: Asistencia): Promise<void> {
		const confirmar = window.confirm(
			`Â¿Deseas eliminar la asistencia #${asistencia.id_asistencia} de ${nombreEstudiante(asistencia)}?`
		);

		if (!confirmar || !usuario) return;

		error = '';
		mensaje = '';
		idEliminando = asistencia.id_asistencia;

		try {
			await solicitarAPI(
				`/asistencias/${asistencia.id_asistencia}?id_usuario=${usuario.id_usuario}`,
				{ method: 'DELETE' }
			);

			mensaje = 'Asistencia eliminada correctamente.';
			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'OcurriÃ³ un error al eliminar la asistencia.';
		} finally {
			idEliminando = null;
		}
	}

	onMount(() => {
		usuario = obtenerUsuario();

		if (!usuario || !obtenerToken()) {
			cerrarSesion();
			return;
		}

		void cargarDatos();
	});
</script>

<div class="container mt-4 mb-5 pagina-asistencias">
	<div
		class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"
	>
		<div>
			<h2 class="fw-bold text-primary mb-1">GestiÃ³n de Asistencias</h2>
			<p class="text-muted mb-0">
				Registro y seguimiento de la asistencia de los estudiantes.
			</p>
		</div>

		<button class="btn btn-primary" onclick={nuevaAsistencia}>
			+ Registrar asistencia
		</button>
	</div>

	{#if mensaje}
		<div class="alert alert-success" role="status">
			{mensaje}
			<button
				type="button"
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
				onclick={() => void cargarDatos()}
				disabled={cargando}
			>
				Reintentar
			</button>
		</div>
	{/if}

	{#if mostrarFormulario}
		<div class="card panel shadow-sm border-0 mb-4">
			<div class="card-header bg-primary text-white">
				<strong>
					{idEditando === null
						? 'Registrar asistencia'
						: `Editar asistencia #${idEditando}`}
				</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						void guardarAsistencia();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="estudiante" class="form-label">
								Estudiante
							</label>

							<select
								id="estudiante"
								class="form-select"
								bind:value={idEstudiante}
								required
								disabled={guardando}
							>
								<option value="">Selecciona un estudiante</option>

								{#each estudiantes as estudiante (estudiante.id_estudiante)}
									<option value={String(estudiante.id_estudiante)}>
										{estudiante.nombre} {estudiante.apellido}
									</option>
								{/each}
							</select>

							{#if estudiantes.length === 0}
								<small class="text-danger">
									Primero debes registrar estudiantes.
								</small>
							{/if}
						</div>

						<div class="col-md-6">
							<label for="fecha" class="form-label">Fecha</label>

							<input
								id="fecha"
								type="date"
								class="form-control"
								bind:value={fecha}
								required
								disabled={guardando}
							/>
						</div>

						<div class="col-md-6">
							<label for="resultado" class="form-label">
								Resultado
							</label>

							<select
								id="resultado"
								class="form-select"
								bind:value={resultado}
								required
								disabled={guardando}
							>
								<option value="Presente">Presente</option>
								<option value="Ausente">Ausente</option>
								<option value="Tarde">Tarde</option>
							</select>
						</div>

						<div class="col-md-6">
							<label for="observacion" class="form-label">
								ObservaciÃ³n
							</label>

							<input
								id="observacion"
								class="form-control"
								bind:value={observacion}
								maxlength="500"
								placeholder="ObservaciÃ³n opcional"
								disabled={guardando}
							/>
						</div>

						<div class="col-12 d-flex flex-wrap gap-2">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando || estudiantes.length === 0}
							>
								{guardando
									? 'Guardando...'
									: idEditando === null
										? 'Guardar asistencia'
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

	<div class="card panel shadow-sm border-0">
		<div
			class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-3 py-3"
		>
			<strong>Listado de asistencias</strong>

			<div class="acciones-listado">
				<input
					type="search"
					class="form-control"
					placeholder="Buscar estudiante o resultado..."
					bind:value={busqueda}
					aria-label="Buscar asistencias"
				/>

				<button
					class="btn btn-outline-primary"
					onclick={() => void cargarDatos()}
					disabled={cargando}
				>
					{cargando ? 'Cargando...' : 'Actualizar listado'}
				</button>
			</div>
		</div>

		<div class="card-body">
			{#if cargando}
				<div class="text-center py-4">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Cargando...</span>
					</div>
					<p class="text-muted mt-2">Consultando asistencias...</p>
				</div>
			{:else if asistenciasFiltradas.length === 0}
				<div class="alert alert-info mb-0">
					{asistencias.length === 0
						? 'No hay asistencias registradas.'
						: 'No se encontraron asistencias con esa bÃºsqueda.'}
				</div>
			{:else}
				<DataTable
    columnas={[
        { clave: 'estudiante', titulo: 'Estudiante' },
        { clave: 'fecha', titulo: 'Fecha' },
        { clave: 'resultado', titulo: 'Resultado' },
        { clave: 'observacion', titulo: 'Observación' },
        { clave: 'acciones', titulo: 'Acciones' }
    ]}
    filas={asistenciasFiltradas.map((asistencia) => ({
        ...asistencia,
        estudiante: nombreEstudiante(asistencia),
        fecha: formatearFecha(asistencia.fecha),
        resultado: asistencia.resultado,
        observacion: asistencia.observacion || '—'
    }))}
    claveFila="id_asistencia"
    rayada={true}
    mensajeVacio="No hay asistencias para mostrar."
>
    {#snippet acciones(fila)}
        {@const asistencia = asistenciasFiltradas.find(
            (item) => item.id_asistencia === fila.id_asistencia
        )}

        {#if asistencia}
            <div class="d-flex flex-wrap gap-2">
                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => editarAsistencia(asistencia)}
                >
                    Editar
                </button>

                <button
                    class="btn btn-sm btn-outline-danger"
                    onclick={() => void eliminarAsistencia(asistencia)}
                    disabled={idEliminando === asistencia.id_asistencia}
                >
                    {idEliminando === asistencia.id_asistencia
                        ? 'Eliminando...'
                        : 'Eliminar'}
                </button>
            </div>
        {/if}
    {/snippet}
</DataTable>

				<p class="text-muted small mb-0">
					Mostrando {asistenciasFiltradas.length} de {asistencias.length}
					registros.
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.pagina-asistencias {
		max-width: 1500px;
		padding-bottom: 30px;
	}

	.panel {
		overflow: hidden;
		border-radius: 14px;
	}

	.acciones-listado {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.acciones-listado input {
		width: min(320px, 65vw);
	}


	.btn {
		border-radius: 8px;
	}

	@media (max-width: 576px) {
		.acciones-listado,
		.acciones-listado input,
		.acciones-listado button {
			width: 100%;
		}
	}
</style>

