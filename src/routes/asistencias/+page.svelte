
<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';
    const ID_USUARIO = 1; // Provisional hasta implementar el inicio de sesión.

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

    let asistencias: Asistencia[] = [];
    let estudiantes: Estudiante[] = [];

    let cargando = true;
    let guardando = false;
    let mostrarFormulario = false;
    let error = '';
    let mensaje = '';

    let id_estudiante = '';
    let fecha = new Date().toLocaleDateString('en-CA');
    let resultado = 'Presente';
    let observacion = '';

    function nombreEstudiante(asistencia: Asistencia) {
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

    function colorResultado(valor: string) {
        const normalizado = valor.toLowerCase();

        if (normalizado.includes('presente')) return 'success';
        if (normalizado.includes('ausente') || normalizado.includes('inasistencia')) {
            return 'danger';
        }
        if (normalizado.includes('tarde')) return 'warning';

        return 'secondary';
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            const [respuestaAsistencias, respuestaEstudiantes] = await Promise.all([
                fetch(`${API_URL}/asistencias/?id_usuario=${ID_USUARIO}`),
                fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`)
            ]);

            if (!respuestaAsistencias.ok) {
                throw new Error(
                    `No se pudieron consultar las asistencias (${respuestaAsistencias.status}).`
                );
            }

            if (!respuestaEstudiantes.ok) {
                throw new Error(
                    `No se pudieron consultar los estudiantes (${respuestaEstudiantes.status}).`
                );
            }

            const datosAsistencias = await respuestaAsistencias.json();
            const datosEstudiantes = await respuestaEstudiantes.json();

            if (!Array.isArray(datosAsistencias) || !Array.isArray(datosEstudiantes)) {
                throw new Error('La API devolvió un formato de datos inesperado.');
            }

            asistencias = datosAsistencias;
            estudiantes = datosEstudiantes;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al cargar la información.';
        } finally {
            cargando = false;
        }
    }

    async function registrarAsistencia(event: SubmitEvent) {
        event.preventDefault();

        guardando = true;
        error = '';
        mensaje = '';

        try {
            const respuesta = await fetch(
                `${API_URL}/asistencias/?id_usuario=${ID_USUARIO}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_estudiante: Number(id_estudiante),
                        fecha,
                        resultado,
                        observacion: observacion.trim() || null
                    })
                }
            );

            if (!respuesta.ok) {
                const detalle = await respuesta.text();

                throw new Error(
                    `No se pudo registrar la asistencia (${respuesta.status}). ${detalle}`
                );
            }

            id_estudiante = '';
            fecha = new Date().toLocaleDateString('en-CA');
            resultado = 'Presente';
            observacion = '';
            mostrarFormulario = false;

            mensaje = 'Asistencia registrada correctamente.';

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo registrar la asistencia.';
        } finally {
            guardando = false;
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<svelte:head>
    <title>Asistencias</title>
</svelte:head>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Gestión de Asistencias</h2>
            <p class="text-muted">
                Registro y seguimiento de la asistencia de los estudiantes.
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
            {mostrarFormulario ? 'Cancelar' : '+ Registrar asistencia'}
        </button>
    </div>

    {#if mensaje}
        <div class="alert alert-success" role="status">
            {mensaje}
        </div>
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
                <strong>Registrar asistencia</strong>
            </div>

            <div class="card-body">
                <form onsubmit={registrarAsistencia}>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="estudiante" class="form-label">
                                Estudiante
                            </label>

                            <select
                                id="estudiante"
                                class="form-select"
                                bind:value={id_estudiante}
                                required
                            >
                                <option value="">Selecciona un estudiante</option>

                                {#each estudiantes as estudiante (estudiante.id_estudiante)}
                                    <option value={estudiante.id_estudiante}>
                                        {estudiante.nombre} {estudiante.apellido}
                                    </option>
                                {/each}
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label for="fecha" class="form-label">Fecha</label>
                            <input
                                id="fecha"
                                type="date"
                                class="form-control"
                                bind:value={fecha}
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="resultado" class="form-label">Resultado</label>

                            <select
                                id="resultado"
                                class="form-select"
                                bind:value={resultado}
                                required
                            >
                                <option value="Presente">Presente</option>
                                <option value="Ausente">Ausente</option>
                                <option value="Tarde">Tarde</option>
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label for="observacion" class="form-label">
                                Observación
                            </label>

                            <input
                                id="observacion"
                                class="form-control"
                                bind:value={observacion}
                                maxlength="500"
                                placeholder="Observación opcional"
                            />
                        </div>
                    </div>

                    <div class="mt-3">
                        <button
                            type="submit"
                            class="btn btn-success"
                            disabled={guardando || estudiantes.length === 0}
                        >
                            {guardando ? 'Guardando...' : 'Guardar asistencia'}
                        </button>

                        <button
                            type="button"
                            class="btn btn-secondary ms-2"
                            onclick={() => mostrarFormulario = false}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
            <strong>Listado de asistencias</strong>

            <button
                class="btn btn-outline-primary btn-sm"
                onclick={cargarDatos}
                disabled={cargando}
            >
                Actualizar listado
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <p class="text-muted">Cargando asistencias...</p>
            {:else if asistencias.length === 0 && !error}
                <p class="text-muted">No hay asistencias registradas.</p>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Fecha</th>
                                <th>Resultado</th>
                                <th>Observación</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each asistencias as asistencia (asistencia.id_asistencia)}
                                <tr>
                                    <td>{asistencia.id_asistencia}</td>
                                    <td>{nombreEstudiante(asistencia)}</td>
                                    <td>{asistencia.fecha}</td>
                                    <td>
                                        <span class="badge text-bg-{colorResultado(asistencia.resultado)}">
                                            {asistencia.resultado}
                                        </span>
                                    </td>
                                    <td>{asistencia.observacion || '—'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>
</div>

