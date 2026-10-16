
<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';
    const ID_USUARIO = 1; // Provisional hasta implementar el inicio de sesión.

    interface Convivencia {
        id_convivencia: number;
        id_estudiante: number;
        nombre?: string;
        apellido?: string;
        fecha: string;
        descripcion: string;
        estado?: boolean;
        resultado?: string;
    }

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
    }

    let convivencias: Convivencia[] = [];
    let estudiantes: Estudiante[] = [];

    let cargando = true;
    let guardando = false;
    let mostrarFormulario = false;
    let error = '';
    let mensaje = '';

    let id_estudiante = '';
    let fecha = new Date().toLocaleDateString('en-CA');
    let descripcion = '';

    function nombreEstudiante(registro: Convivencia): string {
        if (registro.nombre || registro.apellido) {
            return `${registro.nombre ?? ''} ${registro.apellido ?? ''}`.trim();
        }

        const estudiante = estudiantes.find(
            (e) => e.id_estudiante === registro.id_estudiante
        );

        return estudiante
            ? `${estudiante.nombre} ${estudiante.apellido}`
            : `Estudiante #${registro.id_estudiante}`;
    }

    function estadoConvivencia(registro: Convivencia): string {
        if (registro.resultado) return registro.resultado;
        return registro.estado === false ? 'Inactivo' : 'Registrado';
    }

    function colorEstado(registro: Convivencia): string {
        const estado = estadoConvivencia(registro).toLowerCase();

        if (estado.includes('atendido') || estado.includes('resuelto')) {
            return 'success';
        }

        if (estado.includes('pendiente') || estado.includes('seguimiento')) {
            return 'warning';
        }

        if (estado.includes('inactivo')) return 'secondary';

        return 'primary';
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            const [respuestaConvivencias, respuestaEstudiantes] = await Promise.all([
                fetch(`${API_URL}/convivencias/?id_usuario=${ID_USUARIO}`),
                fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`)
            ]);

            if (!respuestaConvivencias.ok) {
                throw new Error(
                    `No se pudieron consultar las convivencias (${respuestaConvivencias.status}).`
                );
            }

            if (!respuestaEstudiantes.ok) {
                throw new Error(
                    `No se pudieron consultar los estudiantes (${respuestaEstudiantes.status}).`
                );
            }

            const datosConvivencias = await respuestaConvivencias.json();
            const datosEstudiantes = await respuestaEstudiantes.json();

            if (
                !Array.isArray(datosConvivencias) ||
                !Array.isArray(datosEstudiantes)
            ) {
                throw new Error('La API devolvió un formato de datos inesperado.');
            }

            convivencias = datosConvivencias;
            estudiantes = datosEstudiantes;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudieron cargar las convivencias.';
        } finally {
            cargando = false;
        }
    }

    async function registrarConvivencia(event: SubmitEvent) {
        event.preventDefault();

        guardando = true;
        error = '';
        mensaje = '';

        try {
            const respuesta = await fetch(
                `${API_URL}/convivencias/?id_usuario=${ID_USUARIO}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_estudiante: Number(id_estudiante),
                        fecha,
                        descripcion: descripcion.trim()
                    })
                }
            );

            if (!respuesta.ok) {
                const detalle = await respuesta.text();

                throw new Error(
                    `No se pudo registrar la convivencia (${respuesta.status}). ${detalle}`
                );
            }

            id_estudiante = '';
            fecha = new Date().toLocaleDateString('en-CA');
            descripcion = '';
            mostrarFormulario = false;
            mensaje = 'Convivencia registrada correctamente.';

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo registrar la convivencia.';
        } finally {
            guardando = false;
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<svelte:head>
    <title>Convivencias</title>
</svelte:head>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Gestión de Convivencias</h2>
            <p class="text-muted">
                Registro y seguimiento de situaciones de convivencia escolar.
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
            {mostrarFormulario ? 'Cancelar' : '+ Registrar convivencia'}
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
            <button
                class="btn btn-sm btn-outline-danger ms-2"
                onclick={cargarDatos}
            >
                Reintentar
            </button>
        </div>
    {/if}

    {#if mostrarFormulario}
        <div class="card shadow-sm mb-4">
            <div class="card-header">
                <strong>Registrar convivencia</strong>
            </div>

            <div class="card-body">
                <form onsubmit={registrarConvivencia}>
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

                        <div class="col-12">
                            <label for="descripcion" class="form-label">
                                Descripción de la situación
                            </label>

                            <textarea
                                id="descripcion"
                                class="form-control"
                                bind:value={descripcion}
                                rows="3"
                                maxlength="1000"
                                required
                            ></textarea>
                        </div>
                    </div>

                    <div class="mt-3">
                        <button
                            type="submit"
                            class="btn btn-success"
                            disabled={guardando || estudiantes.length === 0}
                        >
                            {guardando ? 'Guardando...' : 'Guardar convivencia'}
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
            <strong>Listado de convivencias</strong>

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
                <p class="text-muted">Cargando convivencias...</p>
            {:else if convivencias.length === 0 && !error}
                <p class="text-muted">No hay convivencias registradas.</p>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each convivencias as registro (registro.id_convivencia)}
                                <tr>
                                    <td>{registro.id_convivencia}</td>
                                    <td>{nombreEstudiante(registro)}</td>
                                    <td>{registro.fecha}</td>
                                    <td>{registro.descripcion}</td>
                                    <td>
                                        <span class="badge text-bg-{colorEstado(registro)}">
                                            {estadoConvivencia(registro)}
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

