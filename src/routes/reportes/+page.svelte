<svelte:head>
    <title>Reportes</title>
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
    let riesgos: Riesgo[] = $state([]);
    let casos: Caso[] = $state([]);

    let cargando = $state(false);
    let error = $state('');

    let totalBajo = $state(0);
    let totalMedio = $state(0);
    let totalAlto = $state(0);

    let totalEstudiantes = $derived(estudiantes.length);

    let casosActivos = $derived(
        casos.filter((caso) => caso.estado !== false).length
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

    async function cargarReportes() {
        cargando = true;
        error = '';

        try {
            const [
                resEstudiantes,
                resRiesgos,
                resCasos
            ] = await Promise.all([
                fetch(
                    `${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`
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
            const datosRiesgos = await resRiesgos.json();
            const datosCasos = await resCasos.json();

            estudiantes = Array.isArray(datosEstudiantes)
                ? datosEstudiantes
                : [];

            riesgos = Array.isArray(datosRiesgos)
                ? datosRiesgos
                : [];

            casos = Array.isArray(datosCasos)
                ? datosCasos
                : [];

            // Utilizar el último riesgo calculado por estudiante.
            const ultimoRiesgo = new Map<number, Riesgo>();

            for (const riesgo of riesgos) {
                const anterior = ultimoRiesgo.get(
                    riesgo.id_estudiante
                );

                if (
                    !anterior ||
                    riesgo.fecha_calculo > anterior.fecha_calculo
                ) {
                    ultimoRiesgo.set(
                        riesgo.id_estudiante,
                        riesgo
                    );
                }
            }

            const riesgosActuales = Array.from(
                ultimoRiesgo.values()
            );

            totalBajo = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'bajo'
            ).length;

            totalMedio = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'medio'
            ).length;

            totalAlto = riesgosActuales.filter(
                (r) => r.nivel?.toLowerCase() === 'alto'
            ).length;

        } catch (e) {
            error =
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al cargar los reportes.';
        } finally {
            cargando = false;
        }
    }

    onMount(cargarReportes);
</script>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Reportes y Analítica</h2>

            <p class="text-muted">
                Consulta de información y análisis del comportamiento académico.
            </p>
        </div>

        <button
            class="btn btn-outline-primary"
            onclick={cargarReportes}
            disabled={cargando}
        >
            {cargando ? 'Actualizando...' : 'Actualizar reporte'}
        </button>
    </div>

    {#if error}
        <div class="alert alert-danger" role="alert">
            {error}

            <button
                class="btn btn-sm btn-outline-danger ms-2"
                onclick={cargarReportes}
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
                Generando reporte...
            </p>
        </div>
    {:else}
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5>Total estudiantes</h5>
                        <h2>{totalEstudiantes}</h2>

                        <p class="text-muted mb-0">
                            Estudiantes consultados
                        </p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5>Casos activos</h5>
                        <h2>{casosActivos}</h2>

                        <p class="text-muted mb-0">
                            Casos con estado activo
                        </p>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm border-danger h-100">
                    <div class="card-body text-center">
                        <h5>Riesgo alto</h5>
                        <h2>{totalAlto}</h2>

                        <p class="text-muted mb-0">
                            Estudiantes con riesgo alto actual
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="card shadow-sm">
            <div class="card-header">
                <strong>Resumen de riesgo estudiantil</strong>
            </div>

            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>Nivel</th>
                                <th>Cantidad</th>
                                <th>Distribución</th>
                                <th>Prioridad</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each [
                                {
                                    nivel: 'Bajo',
                                    cantidad: totalBajo,
                                    prioridad: 'Normal'
                                },
                                {
                                    nivel: 'Medio',
                                    cantidad: totalMedio,
                                    prioridad: 'Atención'
                                },
                                {
                                    nivel: 'Alto',
                                    cantidad: totalAlto,
                                    prioridad: 'Prioritario'
                                }
                            ] as item}
                                <tr>
                                    <td>
                                        <span
                                            class="badge {claseNivel(item.nivel)}"
                                        >
                                            {item.nivel}
                                        </span>
                                    </td>

                                    <td>{item.cantidad}</td>

                                    <td>
                                        {#if totalBajo + totalMedio + totalAlto > 0}
                                            {(
                                                (item.cantidad /
                                                    (totalBajo +
                                                        totalMedio +
                                                        totalAlto)) *
                                                100
                                            ).toFixed(1)}%
                                        {:else}
                                            0%
                                        {/if}
                                    </td>

                                    <td>{item.prioridad}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <p class="text-muted small mb-0">
                    La distribución utiliza el último riesgo registrado
                    por estudiante. Los estudiantes sin evaluación de
                    riesgo no se cuentan en esta tabla.
                </p>
            </div>
        </div>
    {/if}
</div>
