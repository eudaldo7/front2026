<svelte:head>
    <title>Seguimientos | Alerta Temprana</title>
    <meta
        name="description"
        content="Registro y control del acompañamiento de los casos."
    />
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

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

    interface Sesion {
        id_usuario?: number;
        [key: string]: unknown;
    }

    let seguimientos = $state<Seguimiento[]>([]);
    let casos = $state<Caso[]>([]);

    let idUsuario = 0;
    let token = '';
    let sesionLista = $state(false);

    let idCaso = $state('');
    let fecha = $state('');
    let observacion = $state('');

    let idEditando = $state<number | null>(null);
    let cargando = $state(false);
    let mensaje = $state('');
    let error = $state('');

    async function solicitarAPI(
        ruta: string,
        opciones: RequestInit = {}
    ): Promise<Response> {
        const encabezados = new Headers(opciones.headers);
        encabezados.set('Authorization', `Bearer ${token}`);

        if (opciones.body && !encabezados.has('Content-Type')) {
            encabezados.set('Content-Type', 'application/json');
        }

        return fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: encabezados
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

    function mensajeError(datos: any, predeterminado: string): string {
        if (typeof datos?.detail === 'string') {
            return datos.detail;
        }

        if (Array.isArray(datos?.detail)) {
            return datos.detail
                .map((item: any) => item.msg ?? JSON.stringify(item))
                .join(', ');
        }

        return predeterminado;
    }

    async function cargarDatos() {
        await Promise.all([cargarSeguimientos(), cargarCasos()]);
    }

    async function cargarSeguimientos() {
        if (!sesionLista || !idUsuario || !token) return;

        try {
            const respuesta = await solicitarAPI(
                `/seguimientos/?id_usuario=${idUsuario}`
            );

            const datos = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(datos, 'No fue posible cargar los seguimientos.')
                );
            }

            if (!Array.isArray(datos)) {
                throw new Error('La API no devolvió una lista válida de seguimientos.');
            }

            seguimientos = datos;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Error al cargar los seguimientos.';
        }
    }

    async function cargarCasos() {
        if (!sesionLista || !idUsuario || !token) return;

        try {
            const respuesta = await solicitarAPI(
                `/casos/?id_usuario=${idUsuario}`
            );

            const datos = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(datos, 'No fue posible cargar los casos.')
                );
            }

            if (!Array.isArray(datos)) {
                throw new Error('La API no devolvió una lista válida de casos.');
            }

            casos = datos;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Error al cargar los casos.';
        }
    }

    function limpiarFormulario() {
        idCaso = '';
        fecha = '';
        observacion = '';
        idEditando = null;
    }

    async function guardarSeguimiento() {
        mensaje = '';
        error = '';

        if (!idCaso || !fecha || !observacion.trim()) {
            error = 'Completa todos los campos antes de guardar.';
            return;
        }

        if (!sesionLista || !idUsuario || !token) {
            error = 'Tu sesión no está disponible. Inicia sesión nuevamente.';
            return;
        }

        const datos = {
            id_caso: Number(idCaso),
            fecha,
            observacion: observacion.trim()
        };

        cargando = true;

        try {
            const editando = idEditando !== null;

            const ruta = editando
                ? `/seguimientos/${idEditando}?id_usuario=${idUsuario}`
                : `/seguimientos/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(ruta, {
                method: editando ? 'PUT' : 'POST',
                body: JSON.stringify(datos)
            });

            const resultado = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(resultado, 'No fue posible guardar el seguimiento.')
                );
            }

            mensaje = editando
                ? 'Seguimiento actualizado correctamente.'
                : 'Seguimiento registrado correctamente.';

            limpiarFormulario();
            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al guardar.';
        } finally {
            cargando = false;
        }
    }

    function editarSeguimiento(seguimiento: Seguimiento) {
        idEditando = seguimiento.id_seguimiento;
        idCaso = String(seguimiento.id_caso);
        fecha = seguimiento.fecha?.slice(0, 10) ?? '';
        observacion = seguimiento.observacion ?? '';

        mensaje = '';
        error = '';

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    async function inactivarSeguimiento(id: number) {
        const confirmar = window.confirm(
            '¿Estás seguro de que deseas inactivar este seguimiento?'
        );

        if (!confirmar) return;

        mensaje = '';
        error = '';
        cargando = true;

        try {
            const respuesta = await solicitarAPI(
                `/seguimientos/${id}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            const resultado = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(resultado, 'No fue posible inactivar el seguimiento.')
                );
            }

            mensaje = resultado?.mensaje
                ?? 'Seguimiento inactivado correctamente.';

            if (idEditando === id) {
                limpiarFormulario();
            }

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al inactivar.';
        } finally {
            cargando = false;
        }
    }

    function nombreCaso(id: number): string {
        const caso = casos.find(
            (c) => Number(c.id_caso) === Number(id)
        );

        return caso
            ? `Caso #${caso.id_caso} - Estudiante #${caso.id_estudiante}`
            : `Caso #${id}`;
    }

    onMount(() => {
        try {
            token = localStorage.getItem('tokenAcceso') ?? '';

            const usuarioGuardado = localStorage.getItem('usuarioSesion');

            if (usuarioGuardado) {
                const usuario = JSON.parse(usuarioGuardado) as Sesion;
                idUsuario = Number(usuario.id_usuario ?? 0);
            }

            if (!token || !Number.isInteger(idUsuario) || idUsuario <= 0) {
                error = 'No se encontró una sesión válida. Inicia sesión nuevamente.';
                return;
            }

            sesionLista = true;
            cargando = true;

            void cargarDatos().finally(() => {
                cargando = false;
            });
        } catch {
            error = 'No se pudo leer la sesión. Inicia sesión nuevamente.';
        }
    });
</script>

<div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
            <h1 class="h3 mb-1">Seguimientos</h1>
            <p class="text-muted mb-0">
                Registro y control del acompañamiento de los casos.
            </p>
        </div>

        <span class="badge text-bg-primary fs-6">
            Total: {seguimientos.length}
        </span>
    </div>

    {#if mensaje}
        <div class="alert alert-success alert-dismissible" role="alert">
            {mensaje}
            <button
                type="button"
                class="btn-close"
                aria-label="Cerrar mensaje"
                onclick={() => (mensaje = '')}
            ></button>
        </div>
    {/if}

    {#if error}
        <div class="alert alert-danger alert-dismissible" role="alert">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>{error}</span>
                <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    onclick={() => {
                        error = '';
                        cargando = true;
                        void cargarDatos().finally(() => {
                            cargando = false;
                        });
                    }}
                    disabled={cargando || !sesionLista}
                >
                    Reintentar
                </button>
            </div>
        </div>
    {/if}

    <div class="card shadow-sm mb-4">
        <div class="card-header bg-primary text-white">
            <h2 class="h5 mb-0">
                {idEditando !== null
                    ? 'Editar seguimiento'
                    : 'Registrar seguimiento'}
            </h2>
        </div>

        <div class="card-body">
            <form
                onsubmit={(event) => {
                    event.preventDefault();
                    void guardarSeguimiento();
                }}
            >
                <div class="row g-3">
                    <div class="col-md-4">
                        <label for="caso" class="form-label">
                            Caso asociado
                        </label>

                        <select
                            id="caso"
                            class="form-select"
                            bind:value={idCaso}
                            required
                        >
                            <option value="">Selecciona un caso</option>

                            {#each casos as caso (caso.id_caso)}
                                <option value={String(caso.id_caso)}>
                                    Caso #{caso.id_caso} - Estudiante #{caso.id_estudiante}
                                </option>
                            {/each}
                        </select>

                        {#if !cargando && casos.length === 0}
                            <small class="text-muted">
                                No hay casos disponibles. Verifica que existan casos y que la API esté funcionando.
                            </small>
                        {/if}
                    </div>

                    <div class="col-md-3">
                        <label for="fecha" class="form-label">
                            Fecha del seguimiento
                        </label>

                        <input
                            id="fecha"
                            type="date"
                            class="form-control"
                            bind:value={fecha}
                            required
                        />
                    </div>

                    <div class="col-md-5">
                        <label for="observacion" class="form-label">
                            Observación
                        </label>

                        <textarea
                            id="observacion"
                            class="form-control"
                            rows="2"
                            bind:value={observacion}
                            placeholder="Describe el seguimiento realizado..."
                            required
                        ></textarea>
                    </div>
                </div>

                <div class="d-flex flex-wrap gap-2 mt-4">
                    <button
                        type="submit"
                        class="btn btn-primary"
                        disabled={cargando || !sesionLista}
                    >
                        {#if cargando}
                            Procesando...
                        {:else if idEditando !== null}
                            Guardar cambios
                        {:else}
                            Registrar seguimiento
                        {/if}
                    </button>

                    {#if idEditando !== null}
                        <button
                            type="button"
                            class="btn btn-secondary"
                            onclick={limpiarFormulario}
                            disabled={cargando}
                        >
                            Cancelar edición
                        </button>
                    {/if}
                </div>
            </form>
        </div>
    </div>

    <div class="card shadow-sm">
        <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h2 class="h5 mb-0">Historial de seguimientos</h2>

            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onclick={() => {
                    cargando = true;
                    error = '';
                    void cargarDatos().finally(() => {
                        cargando = false;
                    });
                }}
                disabled={cargando || !sesionLista}
            >
                {cargando ? 'Cargando...' : 'Actualizar lista'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando && seguimientos.length === 0}
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted mt-2">Consultando seguimientos...</p>
                </div>
            {:else if seguimientos.length === 0}
                <div class="alert alert-info mb-0">
                    No hay seguimientos para mostrar.
                </div>
            {:else}
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Caso</th>
                                <th>Fecha</th>
                                <th>Observación</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each seguimientos as seguimiento, indice (seguimiento.id_seguimiento ?? `${seguimiento.id_caso}-${seguimiento.fecha}-${indice}`)}
                                <tr>
                                    <td>{seguimiento.id_seguimiento ?? '—'}</td>

                                    <td>
                                        {nombreCaso(seguimiento.id_caso)}
                                    </td>

                                    <td>
                                        {seguimiento.fecha?.slice(0, 10) ?? ''}
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

                                    <td>
                                        <div class="d-flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                class="btn btn-sm btn-warning"
                                                onclick={() => editarSeguimiento(seguimiento)}
                                                disabled={!seguimiento.id_seguimiento}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-danger"
                                                onclick={() => void inactivarSeguimiento(seguimiento.id_seguimiento)}
                                                disabled={cargando || seguimiento.estado === false || !seguimiento.id_seguimiento}
                                            >
                                                Inactivar
                                            </button>
                                        </div>
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
        max-width: 420px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
</style>
