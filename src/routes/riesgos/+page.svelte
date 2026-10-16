
<svelte:head>
	<title>Riesgos</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal mientras integramos la autenticación.

	interface Riesgo {
		id_riesgo: number;
		id_estudiante: number;
		nombre?: string;
		apellido?: string;
		score: number;
		nivel: string;
		fecha_calculo: string;
		estado?: boolean;
	}

	interface Estudiante {
		id_estudiante: number;
		nombre: string;
		apellido: string;
	}

	let riesgos: Riesgo[] = [];
	let estudiantes: Estudiante[] = [];

	let idEstudiante = '';
	let mensaje = '';
	let error = '';
	let cargando = false;
	let guardando = false;
	let mostrarFormulario = false;

	// Datos temporales para registrar un riesgo.
	let score = 0;
	let nivel = 'Bajo';

	function actualizarNivel() {
		if (score >= 60) {
			nivel = 'Alto';
		} else if (score >= 30) {
			nivel = 'Medio';
		} else {
			nivel = 'Bajo';
		}
	}

	function claseNivel(valor: string) {
		switch (valor.toLowerCase()) {
			case 'bajo':
				return 'text-bg-success';
			case 'medio':
				return 'text-bg-warning';
			case 'alto':
				return 'text-bg-danger';
			default:
				return 'text-bg-secondary';
		}
	}

	function nombreEstudiante(riesgo: Riesgo) {
		if (riesgo.nombre || riesgo.apellido) {
			return `${riesgo.nombre ?? ''} ${riesgo.apellido ?? ''}`.trim();
		}

		const estudiante = estudiantes.find(
			(e) => e.id_estudiante === riesgo.id_estudiante
		);

		return estudiante
			? `${estudiante.nombre} ${estudiante.apellido}`
			: `Estudiante #${riesgo.id_estudiante}`;
	}

	function formatearFecha(fecha: string) {
		if (!fecha) return 'Sin fecha';

		const fechaCorta = fecha.slice(0, 10);
		const partes = fechaCorta.split('-');

		if (partes.length === 3) {
			return `${partes[2]}/${partes[1]}/${partes[0]}`;
		}

		return fechaCorta;
	}

	async function cargarDatos() {
		cargando = true;
		error = '';
		mensaje = '';

		try {
			const [respuestaRiesgos, respuestaEstudiantes] = await Promise.all([
				fetch(`${API_URL}/riesgos/?id_usuario=${ID_USUARIO}`),
				fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`)
			]);

			if (!respuestaRiesgos.ok) {
				throw new Error('No se pudieron consultar los riesgos.');
			}

			if (!respuestaEstudiantes.ok) {
				throw new Error('No se pudo consultar la lista de estudiantes.');
			}

			const datosRiesgos = await respuestaRiesgos.json();
			const datosEstudiantes = await respuestaEstudiantes.json();

			riesgos = Array.isArray(datosRiesgos) ? datosRiesgos : [];
			estudiantes = Array.isArray(datosEstudiantes)
				? datosEstudiantes
				: [];
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar la información.';
		} finally {
			cargando = false;
		}
	}

	async function calcularRiesgo() {
		error = '';
		mensaje = '';

		if (!idEstudiante) {
			error = 'Selecciona un estudiante.';
			return;
		}

		actualizarNivel();
		guardando = true;

		try {
			const respuesta = await fetch(
				`${API_URL}/riesgos/?id_usuario=${ID_USUARIO}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						id_estudiante: Number(idEstudiante),
						score: Number(score),
						nivel,
						fecha_calculo: new Date().toISOString().slice(0, 10)
					})
				}
			);

			const datos = await respuesta.json().catch(() => null);

			if (!respuesta.ok) {
				throw new Error(
					datos?.detail ?? 'No se pudo registrar el riesgo.'
				);
			}

			mensaje = 'Riesgo registrado correctamente.';
			mostrarFormulario = false;
			idEstudiante = '';
			score = 0;
			nivel = 'Bajo';

			await cargarDatos();
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al registrar el riesgo.';
		} finally {
			guardando = false;
		}
	}

	onMount(cargarDatos);
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Riesgos</h2>
			<p class="text-muted">
				Identificación y seguimiento del nivel de riesgo de los estudiantes.
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
			{mostrarFormulario ? 'Cancelar' : '+ Registrar riesgo'}
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
				<strong>Registrar riesgo estudiantil</strong>
			</div>

			<div class="card-body">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						calcularRiesgo();
					}}
				>
					<div class="row g-3">
						<div class="col-md-6">
							<label for="estudiante" class="form-label">Estudiante</label>
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

						<div class="col-md-6">
							<label for="score" class="form-label">
								Puntaje de riesgo (0 a 100)
							</label>
							<input
								id="score"
								class="form-control"
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={score}
								oninput={actualizarNivel}
								required
							/>
						</div>

						<div class="col-md-6">
							<label for="nivel" class="form-label">Nivel de riesgo</label>
							<input
								id="nivel"
								class="form-control"
								value={nivel}
								readonly
							/>
							<div class="form-text">
								Provisional: Bajo (0–29), Medio (30–59), Alto (60–100).
							</div>
						</div>

						<div class="col-12">
							<button
								type="submit"
								class="btn btn-success"
								disabled={guardando || estudiantes.length === 0}
							>
								{guardando ? 'Guardando...' : 'Guardar riesgo'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div
			class="card-header d-flex justify-content-between align-items-center"
		>
			<strong>Semáforo de riesgo estudiantil</strong>
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
					<p class="text-muted mt-2">Consultando riesgos...</p>
				</div>
			{:else if riesgos.length === 0}
				<div class="alert alert-info mb-0">
					No hay riesgos registrados para mostrar.
				</div>
			{:else}
				<div class="table-responsive">
					<table class="table table-hover align-middle">
						<thead class="table-dark">
							<tr>
								<th>ID</th>
								<th>Estudiante</th>
								<th>Puntaje</th>
								<th>Nivel de riesgo</th>
								<th>Fecha de cálculo</th>
							</tr>
						</thead>

						<tbody>
							{#each riesgos as riesgo (riesgo.id_riesgo)}
								<tr>
									<td>{riesgo.id_riesgo}</td>
									<td>{nombreEstudiante(riesgo)}</td>
									<td>{riesgo.score}</td>
									<td>
										<span class="badge {claseNivel(riesgo.nivel)}">
											{riesgo.nivel}
										</span>
									</td>
									<td>{formatearFecha(riesgo.fecha_calculo)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

