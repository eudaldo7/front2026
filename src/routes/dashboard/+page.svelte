<svelte:head>
    <title>Dashboard - Alerta Temprana</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';
    const ID_USUARIO = 1; // Temporal hasta integrar la autenticación.

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
        curso: string;
    }

    interface Asistencia {
        id_asistencia: number;
        id_estudiante: number;
        resultado: string;
        fecha: string;
    }

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
        estado?: boolean;
        fecha_apertura: string;
    }

    let estudiantes: Estudiante[] = $state([]);
    let asistencias: Asistencia[] = $state([]);
    let riesgos: Riesgo[] = $state([]);
    let casos: Caso[] = $state([]);

    let cargando = $state(false);
    let error = $state('');
    let porcentajeAsistencia = $state(0);
    let riesgosBajos = $state(0);
    let riesgosMedios = $state(0);
    let riesgosAltos = $state(0);

    let totalEstudiantes = $derived(estudiantes.length);

    let totalCasosActivos = $derived(
        casos.filter((caso) => caso.estado !== false).length
    );

    let estudiantesEnRiesgo = $derived.by(() =>
        estudiantes
            .map((estudiante) => {
                const riesgo = riesgos
                    .filter(
                        (r) =>
                            r.id_estudiante === estudiante.id_estudiante
                    )
                    .sort((a, b) =>
                        b.fecha_calculo.localeCompare(a.fecha_calculo)
                    )[0];

                const registrosAsistencia = asistencias.filter(
                    (a) =>
                        a.id_estudiante === estudiante.id_estudiante
                );

                const presentes = registrosAsistencia.filter((a) =>
                    ['presente', 'asistió', 'asistio'].includes(
                        (a.resultado ?? '').toLowerCase()
                    )
                ).length;

                const porcentaje =
                    registrosAsistencia.length > 0
                        ? Math.round(
                              (presentes / registrosAsistencia.length) * 100
                          )
                        : null;

                const casoActivo = casos.some(
                    (c) =>
                        c.id_estudiante === estudiante.id_estudiante &&
                        c.estado !== false
                );

                return {
                    ...estudiante,
                    nivel: riesgo?.nivel ?? 'Sin evaluar',
                    score: riesgo?.score ?? null,
                    asistencia: porcentaje,
                    estado: casoActivo
                        ? 'Caso activo'
                        : 'Sin caso activo'
                };
            })
            .filter((estudiante) =>
                ['alto', 'medio'].includes(
                    estudiante.nivel.toLowerCase()
                )
            )
            .sort(
                (a, b) => (b.score ?? -1) - (a.score ?? -1)
            )
    );

    function claseNivel(nivel: string) {
        switch (nivel.toLowerCase()) {
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

    async function cargarDashboard() {
        cargando = true;
        error = '';

        try {
            const [
                resEstudiantes,
                resAsistencias,
                resRiesgos,
                resCasos
            ] = await Promise.all([
                fetch(
                    `${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`
                ),
                fetch(
                    `${API_URL}/asistencias/?id_usuario=${ID_USUARIO}`
                ),
                fetch(
                    `${API_URL}/riesgos/?id_usuario=${ID_USUARIO}`
                ),
                fetch(
                    `${API_URL}/casos/?id_usuario=${ID_USUARIO}`
                )
            ]);

            if (!resEstudiantes.ok) {
                throw new Error(
                    'No se pudieron consultar los estudiantes.'
                );
            }

            if (!resAsistencias.ok) {
                throw new Error(
                    'No se pudieron consultar las asistencias.'
                );
            }

            if (!resRiesgos.ok) {
                throw new Error(
                    'No se pudieron consultar los riesgos.'
                );
            }

            if (!resCasos.ok) {
                throw new Error(
                    'No se pudieron consultar los casos.'
                );
            }

            const datosEstudiantes = await resEstudiantes.json();
            const datosAsistencias = await resAsistencias.json();
            const datosRiesgos = await resRiesgos.json();
            const datosCasos = await resCasos.json();

            estudiantes = Array.isArray(datosEstudiantes)
                ? datosEstudiantes
                : [];

            asistencias = Array.isArray(datosAsistencias)
                ? datosAsistencias
                : [];

            riesgos = Array.isArray(datosRiesgos)
                ? datosRiesgos
                : [];

            casos = Array.isArray(datosCasos)
                ? datosCasos
                : [];

            // Contar solamente el último cálculo de riesgo
            // registrado para cada estudiante.
            const ultimoRiesgoPorEstudiante =
                new Map<number, Riesgo>();

            for (const riesgo of riesgos) {
                const anterior = ultimoRiesgoPorEstudiante.get(
                    riesgo.id_estudiante
                );

                if (
                    !anterior ||
                    riesgo.fecha_calculo > anterior.fecha_calculo
                ) {
                    ultimoRiesgoPorEstudiante.set(
                        riesgo.id_estudiante,
                        riesgo
                    );
                }
            }

            const riesgosActuales = Array.from(
                ultimoRiesgoPorEstudiante.values()
            );

            riesgosBajos = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'bajo'
            ).length;

            riesgosMedios = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'medio'
            ).length;

            riesgosAltos = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'alto'
            ).length;

            const presentes = asistencias.filter((a) =>
                ['presente', 'asistió', 'asistio'].includes(
                    (a.resultado ?? '').toLowerCase()
                )
            ).length;

            porcentajeAsistencia =
                asistencias.length > 0
                    ? Math.round(
                          (presentes / asistencias.length) * 100
                      )
                    : 0;
        } catch (e) {
            error =
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al cargar el dashboard.';
        } finally {
            cargando = false;
        }
    }

    onMount(cargarDashboard);
</script>

<div class="container mt-4">
    <div
        class="d-flex justify-content-between align-items-center mb-4"
    >
        <div>
            <h2>Dashboard</h2>

            <p class="text-muted">
                Resumen general del seguimiento y riesgo de deserción
                escolar.
            </p>
        </div>

        <button
            class="btn btn-outline-primary"
            onclick={cargarDashboard}
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
                onclick={cargarDashboard}
            >
                Reintentar
            </button>
        </div>
    {/if}

    {#if cargando}
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>

            <p class="text-muted mt-2">
                Consultando información del sistema...
            </p>
        </div>
    {:else}
        <!-- Indicadores principales -->
        <div class="row g-4 mb-4">
            <div class="col-md-3">
                <div class="card shadow-sm border-primary h-100">
                    <div class="card-body">
                        <h6 class="text-muted">Total estudiantes</h6>
                        <h2>{totalEstudiantes}</h2>
                        <p class="mb-0">Estudiantes consultados</p>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm border-success h-100">
                    <div class="card-body">
                        <h6 class="text-muted">Asistencia</h6>
                        <h2>{porcentajeAsistencia}%</h2>
                        <p class="mb-0">De los registros consultados</p>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm border-warning h-100">
                    <div class="card-body">
                        <h6 class="text-muted">Riesgo medio</h6>
                        <h2>{riesgosMedios}</h2>
                        <p class="mb-0">Estudiantes evaluados</p>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm border-danger h-100">
                    <div class="card-body">
                        <h6 class="text-muted">Riesgo alto</h6>
                        <h2>{riesgosAltos}</h2>
                        <p class="mb-0">Atención prioritaria</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Distribución del riesgo y casos -->
        <div class="row g-4 mb-4">
            <div class="col-md-6">
                <div class="card shadow-sm h-100">
                    <div class="card-header">
                        <strong>Distribución del riesgo</strong>
                    </div>

                    <div class="card-body">
                        {#each [
                            {
                                nombre: 'Riesgo bajo',
                                total: riesgosBajos,
                                color: 'bg-success'
                            },
                            {
                                nombre: 'Riesgo medio',
                                total: riesgosMedios,
                                color: 'bg-warning'
                            },
                            {
                                nombre: 'Riesgo alto',
                                total: riesgosAltos,
                                color: 'bg-danger'
                            }
                        ] as item}
                            <div class="mb-3">
                                <div
                                    class="d-flex justify-content-between"
                                >
                                    <span>{item.nombre}</span>
                                    <strong>{item.total}</strong>
                                </div>

                                <div class="progress">
                                    <div
                                        class="progress-bar {item.color}"
                                        style={`width: ${
                                            riesgosBajos +
                                                riesgosMedios +
                                                riesgosAltos >
                                            0
                                                ? (item.total /
                                                      (riesgosBajos +
                                                          riesgosMedios +
                                                          riesgosAltos)) *
                                                  100
                                                : 0
                                        }%`}
                                        role="progressbar"
                                        aria-valuenow={item.total}
                                        aria-valuemin="0"
                                        aria-valuemax={
                                            riesgosBajos +
                                            riesgosMedios +
                                            riesgosAltos
                                        }
                                    ></div>
                                </div>
                            </div>
                        {/each}

                        <p class="text-muted small mb-0">
                            Se utiliza el último riesgo registrado por
                            estudiante.
                        </p>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card shadow-sm h-100">
                    <div class="card-header">
                        <strong>Estado de casos</strong>
                    </div>

                    <div class="card-body">
                        <div
                            class="d-flex justify-content-between align-items-center mb-3"
                        >
                            <span>Casos activos</span>

                            <span class="badge text-bg-danger">
                                {totalCasosActivos}
                            </span>
                        </div>

                        <p class="text-muted small">
                            El backend actual utiliza un estado
                            activo/inactivo. No se calculan estados como
                            «En seguimiento» o «Cerrado» sin un campo
                            específico para ellos.
                        </p>

                        <a
                            href="/casos"
                            class="btn btn-outline-primary"
                        >
                            Consultar casos
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Estudiantes que requieren atención -->
        <div class="card shadow-sm mb-4">
            <div class="card-header">
                <strong>
                    Estudiantes que requieren atención
                </strong>
            </div>

            <div class="card-body">
                {#if estudiantesEnRiesgo.length === 0}
                    <div class="alert alert-info mb-0">
                        No hay estudiantes con riesgo medio o alto en
                        los datos consultados.
                    </div>
                {:else}
                    <div class="table-responsive">
                        <table
                            class="table table-hover align-middle"
                        >
                            <thead class="table-dark">
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Curso</th>
                                    <th>Asistencia</th>
                                    <th>Riesgo</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>

                            <tbody>
                                {#each estudiantesEnRiesgo as estudiante (estudiante.id_estudiante)}
                                    <tr>
                                        <td>
                                            {estudiante.nombre}
                                            {estudiante.apellido}
                                        </td>

                                        <td>{estudiante.curso}</td>

                                        <td>
                                            {estudiante.asistencia === null
                                                ? 'Sin registros'
                                                : `${estudiante.asistencia}%`}
                                        </td>

                                        <td>
                                            <span
                                                class="badge {claseNivel(
                                                    estudiante.nivel
                                                )}"
                                            >
                                                {estudiante.nivel}
                                            </span>
                                        </td>

                                        <td>{estudiante.estado}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>