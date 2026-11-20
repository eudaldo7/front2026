<svelte:head>
    <title>Gestión de casos | Alerta Temprana</title>
    <meta
        name="description"
        content="Registro, consulta y administración de casos de acompañamiento escolar."
    />
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';

    interface Caso {
        id_caso: number;
        id_estudiante: number;
        id_usuario_responsable: number;
        fecha_apertura: string;
        estado?: boolean;
        nombre_estudiante?: string;
        apellido_estudiante?: string;
        nombre_responsable?: string;
        apellido_responsable?: string;
    }

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
    }

    interface Usuario {
        id_usuario: number;
        nombre: string;
        apellido: string;
        id_rol?: number;
        correo?: string;
    }

    interface Sesion {
        id_usuario?: number;
        [key: string]: unknown;
    }

    let casos = $state<Caso[]>([]);
    let estudiantes = $state<Estudiante[]>([]);
    let usuarios = $state<Usuario[]>([]);

    let idUsuario = 0;
    let token = '';

    let idEstudiante = $state('');
    let idResponsable = $state('');
    let fechaApertura = $state(new Date().toISOString().slice(0, 10));

    let mostrarFormulario = $state(false);
    let cargando = $state(false);
    let guardando = $state(false);
    let error = $state('');
    let mensaje = $state('');

    let idCasoEditando = $state<number | null>(null);
    let casoEliminando = $state<number | null>(null);
    let sesionLista = $state(false);

    function nombreEstudiante(caso: Caso): string {
        if (caso.nombre_estudiante || caso.apellido_estudiante) {
            return `${caso.nombre_estudiante ?? ''} ${caso.apellido_estudiante ?? ''}`.trim();
        }

        const estudiante = estudiantes.find(
            (e) => Number(e.id_estudiante) === Number(caso.id_estudiante)
        );

        return estudiante
            ? `${estudiante.nombre} ${estudiante.apellido}`
            : `Estudiante #${caso.id_estudiante}`;
    }

    function nombreResponsable(caso: Caso): string {
        if (caso.nombre_responsable || caso.apellido_responsable) {
            return `${caso.nombre_responsable ?? ''} ${caso.apellido_responsable ?? ''}`.trim();
        }

        const usuario = usuarios.find(
            (u) => Number(u.id_usuario) === Number(caso.id_usuario_responsable)
        );

        return usuario
            ? `${usuario.nombre} ${usuario.apellido}`.trim()
            : `Usuario #${caso.id_usuario_responsable}`;
    }

    function formatearFecha(fecha: string): string {
        if (!fecha) return 'Sin fecha';

        const partes = fecha.slice(0, 10).split('-');

        return partes.length === 3
            ? `${partes[2]}/${partes[1]}/${partes[0]}`
            : fecha;
    }

    function estadoCaso(caso: Caso): string {
        return caso.estado === false ? 'Inactivo' : 'Activo';
    }

    function claseEstado(caso: Caso): string {
        return caso.estado === false
            ? 'text-bg-secondary'
            : 'text-bg-success';
    }

    function limpiarFormulario() {
        idCasoEditando = null;
        idEstudiante = '';
        idResponsable = '';
        fechaApertura = new Date().toISOString().slice(0, 10);
        mostrarFormulario = false;
    }

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
        if (!sesionLista || !idUsuario || !token) {
            error = 'No se encontró una sesión válida. Inicia sesión nuevamente.';
            cargando = false;
            return;
        }

        cargando = true;
        error = '';

        try {
            const [respuestaCasos, respuestaEstudiantes, respuestaUsuarios] =
                await Promise.all([
                    solicitarAPI(`/casos/?id_usuario=${idUsuario}`),
                    solicitarAPI(`/estudiantes/?id_usuario=${idUsuario}`),
                    solicitarAPI(`/usuarios/?id_usuario=${idUsuario}`)
                ]);

            const datosCasos = await leerRespuesta(respuestaCasos);
            const datosEstudiantes = await leerRespuesta(respuestaEstudiantes);
            const datosUsuarios = await leerRespuesta(respuestaUsuarios);

            if (!respuestaCasos.ok) {
                throw new Error(
                    mensajeError(datosCasos, 'No se pudieron consultar los casos.')
                );
            }

            if (!respuestaEstudiantes.ok) {
                throw new Error(
                    mensajeError(datosEstudiantes, 'No se pudo consultar la lista de estudiantes.')
                );
            }

            if (!respuestaUsuarios.ok) {
                throw new Error(
                    mensajeError(datosUsuarios, 'No se pudo consultar la lista de responsables.')
                );
            }

            casos = Array.isArray(datosCasos) ? datosCasos : [];
            estudiantes = Array.isArray(datosEstudiantes)
                ? datosEstudiantes
                : [];
            usuarios = Array.isArray(datosUsuarios)
                ? datosUsuarios
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

    function nuevoCaso() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarCaso(caso: Caso) {
        error = '';
        mensaje = '';

        idCasoEditando = caso.id_caso;
        idEstudiante = String(caso.id_estudiante);
        idResponsable = String(caso.id_usuario_responsable);
        fechaApertura = caso.fecha_apertura
            ? caso.fecha_apertura.slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        mostrarFormulario = true;
    }

    async function guardarCaso() {
        error = '';
        mensaje = '';

        if (!idEstudiante || !idResponsable || !fechaApertura) {
            error = 'Completa todos los campos para continuar.';
            return;
        }

        if (!sesionLista || !idUsuario || !token) {
            error = 'Tu sesión no está disponible. Inicia sesión nuevamente.';
            return;
        }

        guardando = true;

        try {
            const editando = idCasoEditando !== null;

            const url = editando
                ? `/casos/${idCasoEditando}?id_usuario=${idUsuario}`
                : `/casos/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(url, {
                method: editando ? 'PUT' : 'POST',
                body: JSON.stringify({
                    id_estudiante: Number(idEstudiante),
                    id_usuario_responsable: Number(idResponsable),
                    fecha_apertura: fechaApertura
                })
            });

            const datos = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(
                        datos,
                        editando
                            ? 'No se pudo actualizar el caso.'
                            : 'No se pudo registrar el caso.'
                    )
                );
            }

            mensaje = editando
                ? 'Caso actualizado correctamente.'
                : 'Caso registrado correctamente.';

            limpiarFormulario();
            await cargarDatos();
        } catch (e) {
            error =
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al guardar el caso.';
        } finally {
            guardando = false;
        }
    }

    async function eliminarCaso(caso: Caso) {
        const confirmar = confirm(
            `¿Deseas eliminar el caso #${caso.id_caso} del estudiante ${nombreEstudiante(caso)}?`
        );

        if (!confirmar) return;

        error = '';
        mensaje = '';
        casoEliminando = caso.id_caso;

        try {
            const respuesta = await solicitarAPI(
                `/casos/${caso.id_caso}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            const datos = await leerRespuesta(respuesta);

            if (!respuesta.ok) {
                throw new Error(
                    mensajeError(datos, 'No se pudo eliminar el caso.')
                );
            }

            mensaje = 'Caso eliminado correctamente.';
            await cargarDatos();
        } catch (e) {
            error =
                e instanceof Error
                    ? e.message
                    : 'Ocurrió un error al eliminar el caso.';
        } finally {
            casoEliminando = null;
        }
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
                error = 'No se encontró una sesión válida. Cierra sesión e inicia nuevamente.';
                return;
            }

            sesionLista = true;
            void cargarDatos();
        } catch {
            error = 'No se pudo leer la sesión. Inicia sesión nuevamente.';
        }
    });
</script>

<div class="container mt-4 mb-5">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
            <h2 class="fw-bold text-primary mb-1">Gestión de Casos</h2>
            <p class="text-muted mb-0">
                Administración de casos que requieren acompañamiento escolar.
            </p>
        </div>

        <button
            class="btn btn-primary"
            onclick={nuevoCaso}
            disabled={!sesionLista}
        >
            + Abrir caso
        </button>
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
        <div class="alert alert-danger" role="alert">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>{error}</span>
                <button
                    class="btn btn-sm btn-outline-danger"
                    onclick={() => void cargarDatos()}
                    disabled={cargando || !sesionLista}
                >
                    Reintentar
                </button>
            </div>
        </div>
    {/if}

    {#if mostrarFormulario}
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-primary text-white py-3">
                <strong>
                    {idCasoEditando === null
                        ? 'Registrar nuevo caso'
                        : `Editar caso #${idCasoEditando}`}
                </strong>
            </div>

            <div class="card-body">
                <form
                    onsubmit={(event) => {
                        event.preventDefault();
                        void guardarCaso();
                    }}
                >
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label for="estudiante" class="form-label">
                                Estudiante
                            </label>

                            <select
                                id="estudiante"
                                class="form-select"
                                bind:value={idEstudiante}
                                required
                            >
                                <option value="">Selecciona un estudiante</option>

                                {#each estudiantes as estudiante (estudiante.id_estudiante)}
                                    <option value={String(estudiante.id_estudiante)}>
                                        {estudiante.nombre} {estudiante.apellido}
                                    </option>
                                {/each}
                            </select>
                        </div>

                        <div class="col-md-4">
                            <label for="responsable" class="form-label">
                                Usuario responsable
                            </label>

                            <select
                                id="responsable"
                                class="form-select"
                                bind:value={idResponsable}
                                required
                            >
                                <option value="">Selecciona un responsable</option>

                                {#each usuarios as usuario (usuario.id_usuario)}
                                    <option value={String(usuario.id_usuario)}>
                                        {usuario.nombre} {usuario.apellido}
                                    </option>
                                {/each}
                            </select>
                        </div>

                        <div class="col-md-4">
                            <label for="fecha" class="form-label">
                                Fecha de apertura
                            </label>

                            <input
                                id="fecha"
                                type="date"
                                class="form-control"
                                bind:value={fechaApertura}
                                required
                            />
                        </div>

                        <div class="col-12 d-flex flex-wrap gap-2">
                            <button
                                type="submit"
                                class="btn btn-success"
                                disabled={guardando || estudiantes.length === 0 || usuarios.length === 0}
                            >
                                {#if guardando}
                                    Guardando...
                                {:else}
                                    {idCasoEditando === null
                                        ? 'Guardar caso'
                                        : 'Guardar cambios'}
                                {/if}
                            </button>

                            <button
                                type="button"
                                class="btn btn-outline-secondary"
                                onclick={limpiarFormulario}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </form>

                {#if estudiantes.length === 0 || usuarios.length === 0}
                    <div class="alert alert-warning mt-3 mb-0">
                        Para registrar un caso, la API debe proporcionar estudiantes y usuarios.
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <div class="card shadow-sm border-0">
        <div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
            <strong>Casos de acompañamiento</strong>

            <button
                class="btn btn-sm btn-outline-primary"
                onclick={() => void cargarDatos()}
                disabled={cargando || !sesionLista}
            >
                {cargando ? 'Cargando...' : 'Actualizar lista'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted mt-2">Consultando casos...</p>
                </div>
            {:else if casos.length === 0}
                <div class="alert alert-info mb-0">
                    No hay casos registrados para mostrar.
                </div>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover table-striped align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Responsable</th>
                                <th>Fecha de apertura</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each casos as caso, indice (caso.id_caso ?? `${caso.id_estudiante}-${caso.fecha_apertura}-${indice}`)}
                                <tr>
                                    <td>{caso.id_caso ?? '—'}</td>
                                    <td>{nombreEstudiante(caso)}</td>
                                    <td>{nombreResponsable(caso)}</td>
                                    <td>{formatearFecha(caso.fecha_apertura)}</td>
                                    <td>
                                        <span class="badge {claseEstado(caso)}">
                                            {estadoCaso(caso)}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="d-flex flex-wrap gap-2">
                                            <button
                                                class="btn btn-sm btn-outline-primary"
                                                onclick={() => editarCaso(caso)}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                class="btn btn-sm btn-outline-danger"
                                                onclick={() => void eliminarCaso(caso)}
                                                disabled={casoEliminando === caso.id_caso || !caso.id_caso}
                                            >
                                                {casoEliminando === caso.id_caso
                                                    ? 'Eliminando...'
                                                    : 'Eliminar'}
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