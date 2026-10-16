
<svelte:head>
	<title>Notificaciones</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

	interface Riesgo {
		id_riesgo: number;
		id_estudiante: number;
		score: number;
		nivel: string;
		fecha_calculo: string;
	}

	interface Caso {
		id_caso: number;
		id_estudiante: number;
		fecha_apertura: string;
		estado?: boolean;
	}

	interface Estudiante {
		id_estudiante: number;
		nombre: string;
		apellido: string;
	}

	interface Notificacion {
		titulo: string;
		descripcion: string;
		tipo: string;
		fecha: string;
		prioridad: string;
	}

	let notificaciones: Notificacion[] = [];
	let cargando = false;
	let error = '';

	function nombreEstudiante(id: number) {
		const estudiante = estudiantes.find(
			(e) => e.id_estudiante === id
		);

		return estudiante
			? `${estudiante.nombre} ${estudiante.apellido}`
			: `Estudiante #${id}`;
	}

	let estudiantes: Estudiante[] = [];

	function formatearFecha(fecha: string) {
		if (!fecha) return 'Fecha no disponible';

		const partes = fecha.slice(0, 10).split('-');

		return partes.length === 3
			? `${partes[2]}/${partes[1]}/${partes[0]}`
			: fecha;
	}

	function clasePrioridad(prioridad: string) {
		switch (prioridad) {
			case 'Alta':
				return 'text-bg-danger';
			case 'Media':
				return 'text-bg-warning';
			default:
				return 'text-bg-info';
		}
	}

	async function cargarNotificaciones() {
		cargando = true;
		error = '';

		try {
			const [respuestaRiesgos, respuestaCasos, respuestaEstudiantes] =
				await Promise.all([
					fetch(`${API_URL}/riesgos/?id_usuario=${ID_USUARIO}`),
					fetch(`${API_URL}/casos/?id_usuario=${ID_USUARIO}`),
					fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`)
				]);

			if (!respuestaRiesgos.ok) {
				throw new Error('No se pudieron consultar los riesgos.');
			}

			if (!respuestaCasos.ok) {
				throw new Error('No se pudieron consultar los casos.');
			}

			if (!respuestaEstudiantes.ok) {
				throw new Error('No se pudieron consultar los estudiantes.');
			}

			const riesgos: Riesgo[] = await respuestaRiesgos.json();
			const casos: Caso[] = await respuestaCasos.json();
			estudiantes = await respuestaEstudiantes.json();

			const alertasRiesgos: Notificacion[] = riesgos
				.filter((riesgo) => riesgo.nivel?.toLowerCase() === 'alto')
				.map((riesgo) => ({
					titulo: 'Riesgo alto detectado',
					descripcion: `${nombreEstudiante(riesgo.id_estudiante)} presenta un riesgo alto que requiere revisión.`,
					tipo: 'riesgo',
					fecha: riesgo.fecha_calculo,
					prioridad: 'Alta'
				}));

			const alertasCasos: Notificacion[] = casos
				.filter((caso) => caso.estado !== false)
				.map((caso) => ({
					titulo: 'Caso de acompañamiento activo',
					descripcion: `El caso #${caso.id_caso}, correspondiente a ${nombreEstudiante(caso.id_estudiante)}, está activo.`,
					tipo: 'caso',
					fecha: caso.fecha_apertura,
					prioridad: 'Media'
				}));

			notificaciones = [...alertasRiesgos, ...alertasCasos].sort(
				(a, b) => b.fecha.localeCompare(a.fecha)
			);
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: 'Ocurrió un error al cargar las notificaciones.';
		} finally {
			cargando = false;
		}
	}

	onMount(cargarNotificaciones);
</script>

<div class="container mt-4">
	<div class="mb-4 d-flex justify-content-between align-items-center">
		<div>
			<h2>Notificaciones</h2>
			<p class="text-muted">
				Avisos y alertas relacionadas con el seguimiento de estudiantes.
			</p>
		</div>

		<button
			class="btn btn-outline-primary"
			onclick={cargarNotificaciones}
			disabled={cargando}
		>
			{cargando ? 'Actualizando...' : 'Actualizar'}
		</button>
	</div>

	{#if error}
		<div class="alert alert-danger" role="alert">
			{error}
			<button
				class="btn btn-sm btn-outline-danger ms-2"
				onclick={cargarNotificaciones}
			>
				Reintentar
			</button>
		</div>
	{/if}

	<div class="card shadow-sm">
		<div class="card-header">
			<strong>Alertas del sistema</strong>
		</div>

		<div class="card-body">
			{#if cargando}
				<div class="text-center py-4">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Cargando...</span>
					</div>
					<p class="text-muted mt-2">Consultando alertas...</p>
				</div>
			{:else if notificaciones.length === 0 && !error}
				<div class="alert alert-info mb-0">
					No hay alertas para mostrar en este momento.
				</div>
			{:else if notificaciones.length > 0}
				<div class="list-group">
					{#each notificaciones as notificacion, i (`${notificacion.tipo}-${i}`)}
						<div class="list-group-item">
							<div
								class="d-flex justify-content-between align-items-start gap-3"
							>
								<div>
									<h6 class="mb-1">{notificacion.titulo}</h6>
									<p class="mb-1">{notificacion.descripcion}</p>
									<small class="text-muted">
										Fecha: {formatearFecha(notificacion.fecha)}
									</small>
								</div>

								<span class="badge {clasePrioridad(notificacion.prioridad)}">
									{notificacion.prioridad}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
