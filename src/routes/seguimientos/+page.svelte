
<svelte:head>
	<title>Seguimientos</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Seguimiento {
		id_seguimiento: number;
		id_caso: number;
		fecha: string;
		observacion: string;
		estado?: boolean;
	}

	interface Caso {
		id_caso: number;
		id_estudiante: number;
		fecha_apertura: string;
		estado?: boolean;
	}

	let seguimientos: Seguimiento[] = [];
	let casos: Caso[] = [];

	let idCaso = '';
	let fecha = new Date().toISOString().slice(0, 10);
	let observacion = '';

	let mostrarFormulario = false;
	let cargando = false;
	let guardando = false;
	let error = '';
	let mensaje = '';

	function formatearFecha(valor: string) {
		if (!valor) return 'Sin fecha';

		const partes = valor.slice(0, 10).split('-');

		return partes.length === 3
			? `${partes[2]}/${partes[1]}/${partes[0]}`
			: valor;
	}

	function claseEstado(seguimiento: Seguimiento) {
		return seguimiento.estado === false
			? 'text-bg-secondary'
			: 'text-bg-warning';
	}

	function textoEstado(seguimiento: Seguimiento) {
		return seguimiento.estado === false ? 'Inactivo' : 'Registrado';
	}

	async function cargarDatos() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			const [respuestaSeguimientos, respuestaCasos] = await Promise.all([
				fetch(`${API_URL}/seguimientos/?id_usuario=${ID_USUARIO}`),
				fetch(`${API_URL}/casos/?id_usuario=${ID_USUARIO}`)
			]);

			if (!respuestaSeguimientos.ok) {
				throw new Error('No se pudieron consultar los seguimientos.');
			}

			if (!respuestaCasos.ok) {
				throw new Error('No se pudieron consultar los casos.');
			}

			const datosSeguimientos = await respuestaSeguimientos.json();
			const datosCasos = await respuestaCasos.json();

			seguimientos = Array.isArray(datosSeguimientos)
				? datosSeguimientos
				: [];

			casos = Array.isArray(datosCasos) ? datosCasos : [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar la información.';
		} finally {
			cargando = false;
		}
	}

	async function registrarSeguimiento() {
		error = '';
		mensaje = '';

		if (!idCaso || !fecha || !observacion.trim()) {
			error = 'Completa todos los campos antes de guardar.';
			return;
		}

		guardando = true;

		try {
			const respuesta = await fetch(
				`${API_URL}/seguimientos/?id_usuario=${ID_USUARIO}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						id_caso: Number(idCaso),
						fecha,
						observacion: observacion.trim()
					})
				}
			);

			const datos = await respuesta.json().catch(() => null);

			if (!respuesta.ok) {
				throw new Error(
					datos?.detail ?? 'No se pudo registrar el seguimiento.'
				);
			}

			mensaje = 'Seguimiento registrado correctamente.';
			mostrarFormulario = false;
			idCaso = '';
			fecha = new Date().toISOString().slice(0, 10);
			observacion = '';

			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al registrar el seguimiento.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarDatos);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Seguimientos</h2>
			<p class="text-muted">
				Seguimiento de las acciones realizadas en los casos de acompañamiento.
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
			{mostrarFormulario ? 'Cancelar' : '+ Registrar seguimiento'}
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
				<strong>Registrar nuevo seguimiento</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						registrarSeguimiento();
					}}
				>
					<div class="row g-3">
						<div class="col-md-4">
							<label for="caso" class="form-label">Caso</label>

							<select
								id="caso"
								class="form-select"
								bind:value={idCaso}
								required
							>
								<option value="">Selecciona un caso</option>

								{#each casos as caso}
									<option value={String(caso.id_caso)}>
										Caso #{caso.id_caso} — Estudiante #{caso.id_estudiante}
									</option>
								{/each}
							</select>
						</div>

						<div class="col-md-4">
							<label for="fecha" class="form-label">Fecha</label>

							<input
								id="fecha"
								type="date"
								class="form-control"
								bind:value={fecha}
								required
							/>
						</div>

						<div class="col-12">
							<label for="observacion" class="form-label">
								Observación del seguimiento
							</label>

							<textarea
								id="observacion"
								class="form-control"
								rows="4"
								bind:value={observacion}
								placeholder="Describe la reunión, intervención o acción realizada..."
								required
							></textarea>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando || casos.length === 0}
							>
								{guardando ? 'Guardando...' : 'Guardar seguimiento'}
							</button>
						</div>
					</div>
				</form>

				{#if casos.length === 0}
					<div class="form-text mt-3">
						No hay casos disponibles. Primero debe existir un caso registrado.
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<strong>Historial de seguimientos</strong>

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
					<p class="text-muted mt-2">Consultando seguimientos...</p>
				</div>
			{:else if seguimientos.length === 0}
				<div class="alert alert-info mb-0">
					No hay seguimientos registrados para mostrar.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Caso</th>
								<th>Fecha</th>
								<th>Observación</th>
								<th>Estado</th>
							</tr>
						</thead>

						<tbody>
							{#each seguimientos as seguimiento (seguimiento.id_seguimiento)}
								<tr>
									<td>{seguimiento.id_seguimiento}</td>
									<td>Caso #{seguimiento.id_caso}</td>
									<td>{formatearFecha(seguimiento.fecha)}</td>
									<td>{seguimiento.observacion}</td>
									<td>
										<span class="badge {claseEstado(seguimiento)}">
											{textoEstado(seguimiento)}
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

