
<svelte:head>
    <title>Historial | Alerta Temprana</title>
    <meta
        name="description"
        content="Consulta del historial de seguimientos académicos."
    />
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';

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
    }

    let seguimientos = $state<Seguimiento[]>([]);
    let casos = $state<Caso[]>([]);
    let cargando = $state(true);
    let error = $state('');
    let filtro = $state('');

    let token = '';
    let idUsuario = 0;

    const seguimientosFiltrados = $derived(
        seguimientos.filter((seguimiento) => {
            const texto = filtro.trim().toLowerCase();

            if (!texto) return true;

            return (
                String(seguimiento.id_seguimiento).includes(texto) ||
                String(seguimiento.id_caso).includes(texto) ||
                seguimiento.fecha?.includes(texto) ||
                seguimiento.observacion?.toLowerCase().includes(texto)
            );
        })
    );

    function nombreCaso(idCaso: number): string {
        const caso = casos.find(
            (item) => Number(item.id_caso) === Number(idCaso)
        );

        return caso
            ? `Caso #${caso.id_caso} - Estudiante #${caso.id_estudiante}`
            : `Caso #${idCaso}`;
    }

    async function consultarAPI(ruta: string): Promise<Response> {
        return fetch(`${API_URL}${ruta}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    async function leerRespuesta(respuesta: Response): Promise<any> {
        const texto = await respuesta.text();

        if (!texto) return null;

        try {
            return JSON.parse(texto);
        } catch {
            return { detail: texto };
        }
    }

    async function cargarHistorial() {
        error = '';
        cargando = true;

        try {
            const tokenGuardado = localStorage.getItem('tokenAcceso');
            const usuarioGuardado = localStorage.getItem('usuarioSesion');

            if (!tokenGuardado || !usuarioGuardado) {
                throw new Error(
                    'No se encontró una sesión válida. Inicia sesión nuevamente.'
                );
            }

            const usuario = JSON.parse(usuarioGuardado);

            token = tokenGuardado;
            idUsuario = Number(usuario.id_usuario);

            if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
                throw new Error(
                    'No se pudo identificar al usuario de la sesión.'
                );
            }

            const [respuestaSeguimientos, respuestaCasos] =
                await Promise.all([
                    consultarAPI(`/seguimientos/?id_usuario=${idUsuario}`),
                    consultarAPI(`/casos/?id_usuario=${idUsuario}`)
                ]);

            const datosSeguimientos = await leerRespuesta(
                respuestaSeguimientos
            );

            const datosCasos = await leerRespuesta(respuestaCasos);

            if (!respuestaSeguimientos.ok) {
                throw new Error(
                    datosSeguimientos?.detail ??
                    'No fue posible consultar el historial de seguimientos.'
                );
            }

            if (!Array.isArray(datosSeguimientos)) {
                throw new Error(
                    'La API no devolvió una lista válida de seguimientos.'
                );
            }

            seguimientos = datosSeguimientos;

            if (respuestaCasos.ok && Array.isArray(datosCasos)) {
                casos = datosCasos;
            } else {
                casos = [];
            }
        } catch (e) {
            error =
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al consultar el historial.';
        } finally {
            cargando = false;
        }
    }

    onMount(() => {
        void cargarHistorial();
    });
</script>

<div class="container-fluid py-4">
    <div
        class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"
    >
        <div>
            <h1 class="h3 mb-1">Historial de seguimientos</h1>
            <p class="text-muted mb-0">
                Consulta los registros de acompañamiento de los casos.
            </p>
        </div>

        <span class="badge text-bg-primary fs-6">
            Total: {seguimientosFiltrados.length}
        </span>
    </div>

    {#if error}
        <div class="alert alert-danger" role="alert">
            <div
                class="d-flex flex-wrap justify-content-between align-items-center gap-2"
            >
                <span>{error}</span>

                <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    onclick={() => void cargarHistorial()}
                    disabled={cargando}
                >
                    Reintentar
                </button>
            </div>
        </div>
    {/if}

    <div class="card shadow-sm mb-4">
        <div class="card-body">
            <label for="filtro" class="form-label">
                Buscar en el historial
            </label>

            <input
                id="filtro"
                class="form-control"
                type="search"
                bind:value={filtro}
                placeholder="Buscar por ID, caso, fecha u observación..."
            />
        </div>
    </div>

    <div class="card shadow-sm">
        <div
            class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"
        >
            <h2 class="h5 mb-0">Registros anteriores</h2>

            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                onclick={() => void cargarHistorial()}
                disabled={cargando}
            >
                {cargando ? 'Consultando...' : 'Actualizar historial'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <div class="text-center py-5">
                    <div
                        class="spinner-border text-primary"
                        role="status"
                    >
                        <span class="visually-hidden">Cargando...</span>
                    </div>

                    <p class="text-muted mt-2">
                        Consultando registros...
                    </p>
                </div>
            {:else if seguimientosFiltrados.length === 0}
                <div class="alert alert-info mb-0">
                    {#if filtro.trim()}
                        No se encontraron registros que coincidan con la búsqueda.
                    {:else}
                        No hay seguimientos disponibles para mostrar.
                    {/if}
                </div>
            {:else}
                <div class="table-responsive">
                    <table
                        class="table table-striped table-hover align-middle"
                    >
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Caso asociado</th>
                                <th>Fecha</th>
                                <th>Observación</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each seguimientosFiltrados as seguimiento (seguimiento.id_seguimiento)}
                                <tr>
                                    <td>
                                        {seguimiento.id_seguimiento}
                                    </td>

                                    <td>
                                        {nombreCaso(seguimiento.id_caso)}
                                    </td>

                                    <td>
                                        {seguimiento.fecha?.slice(0, 10) ?? '—'}
                                    </td>

                                    <td class="observacion">
                                        {seguimiento.observacion}
                                    </td>

                                    <td>
                                        {#if seguimiento.estado === false}
                                            <span class="badge text-bg-secondary">
                                                Inactivo
                                            </span>
                                        {:else}
                                            <span class="badge text-bg-success">
                                                Activo
                                            </span>
                                        {/if}
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

<style>
    .observacion {
        min-width: 220px;
        max-width: 480px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
</style>
