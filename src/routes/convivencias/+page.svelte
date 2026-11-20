<svelte:head>
    <title>Convivencias</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';

    interface UsuarioSesion {
        id_usuario: number;
        nombre?: string;
        correo?: string;
        id_rol?: number;
    }

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

    let convivencias = $state<Convivencia[]>([]);
    let estudiantes = $state<Estudiante[]>([]);

    let usuario = $state<UsuarioSesion | null>(null);
    let token = $state('');

    let cargando = $state(true);
    let guardando = $state(false);
    let eliminando = $state(false);
    let mostrarFormulario = $state(false);

    let error = $state('');
    let mensaje = $state('');

    let id_convivencia = $state<number | null>(null);
    let id_estudiante = $state('');
    let fecha = $state(new Date().toLocaleDateString('en-CA'));
    let descripcion = $state('');

    const modoEdicion = $derived(id_convivencia !== null);

    function obtenerSesion(): boolean {
        try {
            const tokenGuardado = localStorage.getItem('tokenAcceso');
            const usuarioGuardado = localStorage.getItem('usuarioSesion');

            if (!tokenGuardado || !usuarioGuardado) {
                error = 'No hay una sesión iniciada. Inicia sesión nuevamente.';
                return false;
            }

            const usuarioParseado = JSON.parse(usuarioGuardado) as UsuarioSesion;

            if (!usuarioParseado.id_usuario) {
                error = 'No se encontró el identificador del usuario en la sesión.';
                return false;
            }

            token = tokenGuardado;
            usuario = usuarioParseado;

            return true;
        } catch {
            error = 'No se pudo recuperar la sesión. Inicia sesión nuevamente.';
            return false;
        }
    }

    async function solicitarAPI(
        ruta: string,
        opciones: RequestInit = {}
    ): Promise<Response> {
        if (!token || !usuario) {
            throw new Error('La sesión no está disponible. Inicia sesión nuevamente.');
        }

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

        if (estado.includes('inactivo')) {
            return 'secondary';
        }

        return 'primary';
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            if (!obtenerSesion()) return;

            const idUsuario = usuario!.id_usuario;

            const [respuestaConvivencias, respuestaEstudiantes] =
                await Promise.all([
                    solicitarAPI(`/convivencias/?id_usuario=${idUsuario}`),
                    solicitarAPI(`/estudiantes/?id_usuario=${idUsuario}`)
                ]);

            if (!respuestaConvivencias.ok) {
                const detalle = await respuestaConvivencias.text();

                throw new Error(
                    `No se pudieron consultar las convivencias (${respuestaConvivencias.status}). ${detalle}`
                );
            }

            if (!respuestaEstudiantes.ok) {
                const detalle = await respuestaEstudiantes.text();

                throw new Error(
                    `No se pudieron consultar los estudiantes (${respuestaEstudiantes.status}). ${detalle}`
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

    function limpiarFormulario() {
        id_convivencia = null;
        id_estudiante = '';
        fecha = new Date().toLocaleDateString('en-CA');
        descripcion = '';
    }

    function nuevaConvivencia() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarConvivencia(registro: Convivencia) {
        id_convivencia = registro.id_convivencia;
        id_estudiante = String(registro.id_estudiante);
        fecha = String(registro.fecha).substring(0, 10);
        descripcion = registro.descripcion;

        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    async function guardarConvivencia(event: SubmitEvent) {
        event.preventDefault();

        error = '';
        mensaje = '';

        if (!obtenerSesion()) return;

        if (!id_estudiante || !fecha || !descripcion.trim()) {
            error = 'Completa todos los campos antes de guardar.';
            return;
        }

        guardando = true;

        try {
            const idUsuario = usuario!.id_usuario;

            const datos = {
                id_estudiante: Number(id_estudiante),
                fecha,
                descripcion: descripcion.trim()
            };

            const url = modoEdicion
                ? `/convivencias/${id_convivencia}?id_usuario=${idUsuario}`
                : `/convivencias/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(url, {
                method: modoEdicion ? 'PUT' : 'POST',
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                const detalle = await respuesta.text();

                throw new Error(
                    `No se pudo guardar la convivencia (${respuesta.status}). ${detalle}`
                );
            }

            mensaje = modoEdicion
                ? 'Convivencia actualizada correctamente.'
                : 'Convivencia registrada correctamente.';

            mostrarFormulario = false;
            limpiarFormulario();

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo guardar la convivencia.';
        } finally {
            guardando = false;
        }
    }

    async function eliminarConvivencia(registro: Convivencia) {
        const confirmar = confirm(
            `¿Deseas inactivar el registro de convivencia de ${nombreEstudiante(registro)}?`
        );

        if (!confirmar) return;

        if (!obtenerSesion()) return;

        eliminando = true;
        error = '';
        mensaje = '';

        try {
            const idUsuario = usuario!.id_usuario;

            const respuesta = await solicitarAPI(
                `/convivencias/${registro.id_convivencia}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            if (!respuesta.ok) {
                const detalle = await respuesta.text();

                throw new Error(
                    `No se pudo inactivar la convivencia (${respuesta.status}). ${detalle}`
                );
            }

            mensaje = 'Registro de convivencia inactivado correctamente.';

            if (id_convivencia === registro.id_convivencia) {
                limpiarFormulario();
                mostrarFormulario = false;
            }

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo inactivar la convivencia.';
        } finally {
            eliminando = false;
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Gestión de Convivencias</h2>
            <p class="text-muted">
                Registro y seguimiento de situaciones de convivencia escolar.
            </p>
        </div>

        <button class="btn btn-primary" onclick={nuevaConvivencia}>
            + Registrar convivencia
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
                <strong>
                    {modoEdicion ? 'Editar convivencia' : 'Registrar convivencia'}
                </strong>
            </div>

            <div class="card-body">
                <form onsubmit={guardarConvivencia}>
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
                                    <option value={String(estudiante.id_estudiante)}>
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
                            {guardando
                                ? 'Guardando...'
                                : modoEdicion
                                    ? 'Guardar cambios'
                                    : 'Guardar convivencia'}
                        </button>

                        <button
                            type="button"
                            class="btn btn-secondary ms-2"
                            onclick={() => {
                                mostrarFormulario = false;
                                limpiarFormulario();
                                error = '';
                            }}
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
                {cargando ? 'Cargando...' : 'Actualizar listado'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <p class="text-muted">Cargando convivencias...</p>
            {:else if convivencias.length === 0 && !error}
                <p class="text-muted">No hay convivencias registradas.</p>
            {:else if convivencias.length > 0}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each convivencias as registro (registro.id_convivencia)}
                                <tr>
                                    <td>{registro.id_convivencia}</td>
                                    <td>{nombreEstudiante(registro)}</td>
                                    <td>{String(registro.fecha).substring(0, 10)}</td>
                                    <td>{registro.descripcion}</td>

                                    <td>
                                        <span class="badge text-bg-{colorEstado(registro)}">
                                            {estadoConvivencia(registro)}
                                        </span>
                                    </td>

                                    <td>
                                        <div class="d-flex gap-2">
                                            <button
                                                class="btn btn-warning btn-sm"
                                                onclick={() => editarConvivencia(registro)}
                                                disabled={eliminando || guardando}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                class="btn btn-danger btn-sm"
                                                onclick={() => eliminarConvivencia(registro)}
                                                disabled={eliminando || guardando}
                                            >
                                                {eliminando ? 'Procesando...' : 'Inactivar'}
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