
<svelte:head>
    <title>Calificaciones | Alerta Temprana</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = 'http://127.0.0.1:8001';

    interface UsuarioSesion {
        id_usuario?: number;
    }

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

    interface Rol {
        id_rol: number;
        nombre: string;
    }

    let notas = $state<Nota[]>([]);
    let estudiantes = $state<Estudiante[]>([]);
    let roles = $state<Rol[]>([]);

    let cargando = $state(true);
    let guardando = $state(false);
    let eliminando = $state(false);
    let mostrarFormulario = $state(false);

    let error = $state('');
    let mensaje = $state('');

    let id_nota = $state<number | null>(null);
    let id_estudiante = $state('');
    let asignatura = $state('');
    let nota = $state<number>(3);
    let fecha = $state(new Date().toLocaleDateString('en-CA'));

    const modoEdicion = $derived(id_nota !== null);

    function obtenerSesion() {
        const token = localStorage.getItem('tokenAcceso');
        const textoUsuario = localStorage.getItem('usuarioSesion');

        if (!token || !textoUsuario) {
            throw new Error(
                'No se encontró la sesión. Cierra sesión e inicia sesión nuevamente.'
            );
        }

        let usuario: UsuarioSesion;

        try {
            usuario = JSON.parse(textoUsuario);
        } catch {
            throw new Error('No se pudo leer la información de la sesión.');
        }

        if (!usuario.id_usuario) {
            throw new Error('La sesión no contiene un ID de usuario válido.');
        }

        return {
            token,
            idUsuario: usuario.id_usuario
        };
    }

    async function solicitarAPI(
        ruta: string,
        opciones: RequestInit = {}
    ): Promise<Response> {
        const { token } = obtenerSesion();

        return fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opciones.headers ?? {})
            }
        });
    }

    async function obtenerError(respuesta: Response): Promise<string> {
        try {
            const datos = await respuesta.json();
            return datos.detail ?? datos.mensaje ?? `Error HTTP ${respuesta.status}`;
        } catch {
            return `Error HTTP ${respuesta.status}`;
        }
    }

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
            const { idUsuario } = obtenerSesion();

            const [respuestaNotas, respuestaEstudiantes] = await Promise.all([
                solicitarAPI(`/notas/?id_usuario=${idUsuario}`),
                solicitarAPI(`/estudiantes/?id_usuario=${idUsuario}`)
            ]);

            if (!respuestaNotas.ok) {
                throw new Error(await obtenerError(respuestaNotas));
            }

            if (!respuestaEstudiantes.ok) {
                throw new Error(await obtenerError(respuestaEstudiantes));
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
                : 'No se pudieron cargar las calificaciones.';
        } finally {
            cargando = false;
        }
    }

    function limpiarFormulario() {
        id_nota = null;
        id_estudiante = '';
        asignatura = '';
        nota = 3;
        fecha = new Date().toLocaleDateString('en-CA');
    }

    function abrirFormularioNuevo() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarNota(registro: Nota) {
        id_nota = registro.id_nota;
        id_estudiante = String(registro.id_estudiante);
        asignatura = registro.asignatura;
        nota = Number(registro.nota);
        fecha = String(registro.fecha).substring(0, 10);

        error = '';
        mensaje = '';
        mostrarFormulario = true;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function guardarNota(event: SubmitEvent) {
        event.preventDefault();

        error = '';
        mensaje = '';

        if (!id_estudiante || !asignatura.trim() || !fecha) {
            error = 'Completa todos los campos antes de guardar.';
            return;
        }

        if (!Number.isFinite(Number(nota)) || Number(nota) < 0 || Number(nota) > 5) {
            error = 'La calificación debe estar entre 0 y 5.';
            return;
        }

        guardando = true;

        try {
            const { idUsuario } = obtenerSesion();

            const datos = {
                id_estudiante: Number(id_estudiante),
                asignatura: asignatura.trim(),
                nota: Number(nota),
                fecha
            };

            const url = id_nota !== null
                ? `/notas/${id_nota}?id_usuario=${idUsuario}`
                : `/notas/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(url, {
                method: id_nota !== null ? 'PUT' : 'POST',
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            mensaje = id_nota !== null
                ? 'Calificación actualizada correctamente.'
                : 'Calificación registrada correctamente.';

            mostrarFormulario = false;
            limpiarFormulario();

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo guardar la calificación.';
        } finally {
            guardando = false;
        }
    }

    async function eliminarNota(registro: Nota) {
        const confirmar = window.confirm(
            `¿Deseas inactivar la calificación de ${nombreEstudiante(registro)} en ${registro.asignatura}?`
        );

        if (!confirmar) return;

        eliminando = true;
        error = '';
        mensaje = '';

        try {
            const { idUsuario } = obtenerSesion();

            const respuesta = await solicitarAPI(
                `/notas/${registro.id_nota}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            mensaje = 'Calificación inactivada correctamente.';

            if (id_nota === registro.id_nota) {
                limpiarFormulario();
                mostrarFormulario = false;
            }

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No se pudo inactivar la calificación.';
        } finally {
            eliminando = false;
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
            <h2 class="fw-bold">Gestión de Calificaciones</h2>
            <p class="text-muted mb-0">
                Registro y seguimiento del rendimiento académico.
            </p>
        </div>

        <button
            class="btn btn-primary"
            onclick={abrirFormularioNuevo}
            disabled={cargando || estudiantes.length === 0}
        >
            + Registrar calificación
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
                disabled={cargando}
            >
                Reintentar
            </button>
        </div>
    {/if}

    {#if mostrarFormulario}
        <div class="card shadow-sm mb-4">
            <div class="card-header">
                <strong>{modoEdicion ? 'Editar calificación' : 'Registrar calificación'}</strong>
            </div>

            <div class="card-body">
                <form onsubmit={guardarNota}>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="estudiante" class="form-label">Estudiante</label>
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
                            <label for="asignatura" class="form-label">Asignatura</label>
                            <input
                                id="asignatura"
                                class="form-control"
                                bind:value={asignatura}
                                maxlength="100"
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="nota" class="form-label">Calificación (0 a 5)</label>
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
                            disabled={guardando || eliminando || estudiantes.length === 0}
                        >
                            {guardando
                                ? 'Guardando...'
                                : modoEdicion
                                    ? 'Guardar cambios'
                                    : 'Guardar calificación'}
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
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>Listado de calificaciones</strong>

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
                <p class="text-muted">Cargando calificaciones...</p>
            {:else if notas.length === 0 && !error}
                <p class="text-muted">No hay calificaciones registradas.</p>
            {:else if notas.length > 0}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Asignatura</th>
                                <th>Calificación</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each notas as registro (registro.id_nota)}
                                <tr>
                                    <td>{registro.id_nota}</td>
                                    <td>{nombreEstudiante(registro)}</td>
                                    <td>{registro.asignatura}</td>
                                    <td>
                                        <span class={`badge text-bg-${colorNota(Number(registro.nota))}`}>
                                            {registro.nota}
                                        </span>
                                    </td>
                                    <td>{String(registro.fecha).substring(0, 10)}</td>
                                    <td>
                                        <div class="d-flex gap-2">
                                            <button
                                                class="btn btn-warning btn-sm"
                                                onclick={() => editarNota(registro)}
                                                disabled={eliminando || guardando}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                class="btn btn-danger btn-sm"
                                                onclick={() => eliminarNota(registro)}
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
