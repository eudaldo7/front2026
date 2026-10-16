
<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';
    const ID_USUARIO = 1; // Provisional hasta implementar el inicio de sesión.

    interface Nota {
        id_nota: number;
        id_estudiante: number;
        nombre?: string;
        apellido?: string;
        asignatura: string;
        nota: number;
        fecha: string;
    }

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
    }

    let notas: Nota[] = [];
    let estudiantes: Estudiante[] = [];

    let cargando = true;
    let guardando = false;
    let mostrarFormulario = false;
    let error = '';
    let mensaje = '';

    let id_estudiante = '';
    let asignatura = '';
    let nota = 3.0;
    let fecha = new Date().toLocaleDateString('en-CA');

    function nombreEstudiante(registro: Nota): string {
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

    function colorNota(valor: number): string {
        if (valor >= 4) return 'success';
        if (valor >= 3) return 'primary';
        return 'danger';
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            const [respuestaNotas, respuestaEstudiantes] = await Promise.all([
                fetch(`${API_URL}/notas/?id_usuario=${ID_USUARIO}`),
                fetch(`${API_URL}/estudiantes/?id_usuario=${ID_USUARIO}`)
            ]);

            if (!respuestaNotas.ok) {
                throw new Error(
                    `No se pudieron consultar las notas (${respuestaNotas.status}).`
                );
            }

            if (!respuestaEstudiantes.ok) {
                throw new Error(
                    `No se pudieron consultar los estudiantes (${respuestaEstudiantes.status}).`
                );
            }

            const datosNotas = await respuestaNotas.json();
            const datosEstudiantes = await respuestaEstudiantes.json();

            if (!Array.isArray(datosNotas) || !Array.isArray(datosEstudiantes)) {
                throw new Error('La API devolvió un formato de datos inesperado.');
            }

            notas = datosNotas;
            estudiantes = datosEstudiantes;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudieron cargar las notas.';
        } finally {
            cargando = false;
        }
    }

    async function registrarNota(event: SubmitEvent) {
        event.preventDefault();

        guardando = true;
        error = '';
        mensaje = '';

        try {
            const respuesta = await fetch(
                `${API_URL}/notas/?id_usuario=${ID_USUARIO}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_estudiante: Number(id_estudiante),
                        asignatura: asignatura.trim(),
                        nota: Number(nota),
                        fecha
                    })
                }
            );

            if (!respuesta.ok) {
                const detalle = await respuesta.text();

                throw new Error(
                    `No se pudo registrar la nota (${respuesta.status}). ${detalle}`
                );
            }

            id_estudiante = '';
            asignatura = '';
            nota = 3.0;
            fecha = new Date().toLocaleDateString('en-CA');
            mostrarFormulario = false;
            mensaje = 'Nota registrada correctamente.';

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo registrar la nota.';
        } finally {
            guardando = false;
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<svelte:head>
    <title>Notas</title>
</svelte:head>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Gestión de Notas</h2>
            <p class="text-muted">
                Registro y seguimiento del rendimiento académico.
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
            {mostrarFormulario ? 'Cancelar' : '+ Registrar nota'}
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
                <strong>Registrar nota</strong>
            </div>

            <div class="card-body">
                <form onsubmit={registrarNota}>
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
                            <label for="asignatura" class="form-label">
                                Asignatura
                            </label>

                            <input
                                id="asignatura"
                                class="form-control"
                                bind:value={asignatura}
                                maxlength="100"
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="nota" class="form-label">Calificación</label>

                            <input
                                id="nota"
                                type="number"
                                class="form-control"
                                bind:value={nota}
                                min="0"
                                max="5"
                                step="0.1"
                                required
                            />
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
                    </div>

                    <div class="mt-3">
                        <button
                            type="submit"
                            class="btn btn-success"
                            disabled={guardando || estudiantes.length === 0}
                        >
                            {guardando ? 'Guardando...' : 'Guardar nota'}
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
            <strong>Listado de notas</strong>

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
                <p class="text-muted">Cargando notas...</p>
            {:else if notas.length === 0 && !error}
                <p class="text-muted">No hay notas registradas.</p>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Asignatura</th>
                                <th>Nota</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each notas as registro (registro.id_nota)}
                                <tr>
                                    <td>{registro.id_nota}</td>
                                    <td>{nombreEstudiante(registro)}</td>
                                    <td>{registro.asignatura}</td>
                                    <td>
                                        <span class="badge text-bg-{colorNota(Number(registro.nota))}">
                                            {registro.nota}
                                        </span>
                                    </td>
                                    <td>{registro.fecha}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>
</div>
