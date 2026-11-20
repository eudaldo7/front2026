<svelte:head>
    <title>Riesgos</title>
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

    interface Riesgo {
        id_riesgo: number;
        id_estudiante: number;
        nombre?: string;
        apellido?: string;
        score: number;
        nivel: string;
        fecha_calculo: string;
        estado?: boolean;
    }

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
    }

    let riesgos = $state<Riesgo[]>([]);
    let estudiantes = $state<Estudiante[]>([]);

    let usuario = $state<UsuarioSesion | null>(null);
    let token = $state('');

    let idEstudiante = $state('');
    let score = $state(0);
    let nivel = $state('Bajo');

    let mensaje = $state('');
    let error = $state('');
    let cargando = $state(false);
    let guardando = $state(false);
    let eliminando = $state(false);
    let mostrarFormulario = $state(false);

    let idRiesgo = $state<number | null>(null);

    const modoEdicion = $derived(idRiesgo !== null);

    function obtenerSesion(): boolean {
        try {
            const tokenGuardado = localStorage.getItem('tokenAcceso');
            const usuarioGuardado = localStorage.getItem('usuarioSesion');

            if (!tokenGuardado || !usuarioGuardado) {
                error = 'No hay una sesión iniciada. Cierra sesión e inicia sesión nuevamente.';
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

    function actualizarNivel() {
        const puntaje = Number(score);

        if (puntaje >= 60) {
            nivel = 'Alto';
        } else if (puntaje >= 30) {
            nivel = 'Medio';
        } else {
            nivel = 'Bajo';
        }
    }

    function claseNivel(valor: string): string {
        switch ((valor ?? '').toLowerCase()) {
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

    function nombreEstudiante(riesgo: Riesgo): string {
        if (riesgo.nombre || riesgo.apellido) {
            return `${riesgo.nombre ?? ''} ${riesgo.apellido ?? ''}`.trim();
        }

        const estudiante = estudiantes.find(
            (e) => e.id_estudiante === riesgo.id_estudiante
        );

        return estudiante
            ? `${estudiante.nombre} ${estudiante.apellido}`
            : `Estudiante #${riesgo.id_estudiante}`;
    }

    function formatearFecha(fecha: string): string {
        if (!fecha) return 'Sin fecha';

        const fechaCorta = fecha.slice(0, 10);
        const partes = fechaCorta.split('-');

        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        return fechaCorta;
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            if (!obtenerSesion()) {
                return;
            }

            const idUsuario = usuario!.id_usuario;

            const [respuestaRiesgos, respuestaEstudiantes] = await Promise.all([
                solicitarAPI(`/riesgos/?id_usuario=${idUsuario}`),
                solicitarAPI(`/estudiantes/?id_usuario=${idUsuario}`)
            ]);

            if (!respuestaRiesgos.ok) {
                const detalle = await respuestaRiesgos.text();

                throw new Error(
                    `No se pudieron consultar los riesgos (${respuestaRiesgos.status}). ${detalle}`
                );
            }

            if (!respuestaEstudiantes.ok) {
                const detalle = await respuestaEstudiantes.text();

                throw new Error(
                    `No se pudieron consultar los estudiantes (${respuestaEstudiantes.status}). ${detalle}`
                );
            }

            const datosRiesgos = await respuestaRiesgos.json();
            const datosEstudiantes = await respuestaEstudiantes.json();

            if (
                !Array.isArray(datosRiesgos) ||
                !Array.isArray(datosEstudiantes)
            ) {
                throw new Error('La API devolvió un formato de datos inesperado.');
            }

            riesgos = datosRiesgos;
            estudiantes = datosEstudiantes;
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al cargar la información.';
        } finally {
            cargando = false;
        }
    }

    function limpiarFormulario() {
        idRiesgo = null;
        idEstudiante = '';
        score = 0;
        nivel = 'Bajo';
    }

    function nuevoRiesgo() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarRiesgo(riesgo: Riesgo) {
        idRiesgo = riesgo.id_riesgo;
        idEstudiante = String(riesgo.id_estudiante);
        score = Number(riesgo.score);
        nivel = riesgo.nivel;

        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    async function guardarRiesgo(event: SubmitEvent) {
        event.preventDefault();

        error = '';
        mensaje = '';

        if (!obtenerSesion()) {
            return;
        }

        if (!idEstudiante) {
            error = 'Selecciona un estudiante.';
            return;
        }

        if (
            !Number.isFinite(Number(score)) ||
            Number(score) < 0 ||
            Number(score) > 100
        ) {
            error = 'El puntaje debe estar entre 0 y 100.';
            return;
        }

        actualizarNivel();
        guardando = true;

        try {
            const idUsuario = usuario!.id_usuario;

            const datos = {
                id_estudiante: Number(idEstudiante),
                score: Number(score),
                nivel,
                fecha_calculo: new Date().toLocaleDateString('en-CA')
            };

            const url = modoEdicion
                ? `/riesgos/${idRiesgo}?id_usuario=${idUsuario}`
                : `/riesgos/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(url, {
                method: modoEdicion ? 'PUT' : 'POST',
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json().catch(() => null);

            if (!respuesta.ok) {
                throw new Error(
                    resultado?.detail ??
                    `No se pudo guardar el riesgo (${respuesta.status}).`
                );
            }

            mensaje = modoEdicion
                ? 'Riesgo actualizado correctamente.'
                : 'Riesgo registrado correctamente.';

            mostrarFormulario = false;
            limpiarFormulario();

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al guardar el riesgo.';
        } finally {
            guardando = false;
        }
    }

    async function eliminarRiesgo(riesgo: Riesgo) {
        const confirmar = confirm(
            `¿Deseas inactivar el riesgo de ${nombreEstudiante(riesgo)}?`
        );

        if (!confirmar) return;

        if (!obtenerSesion()) {
            return;
        }

        eliminando = true;
        error = '';
        mensaje = '';

        try {
            const idUsuario = usuario!.id_usuario;

            const respuesta = await solicitarAPI(
                `/riesgos/${riesgo.id_riesgo}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            const resultado = await respuesta.json().catch(() => null);

            if (!respuesta.ok) {
                throw new Error(
                    resultado?.detail ??
                    `No se pudo inactivar el riesgo (${respuesta.status}).`
                );
            }

            mensaje = 'Riesgo inactivado correctamente.';

            if (idRiesgo === riesgo.id_riesgo) {
                limpiarFormulario();
                mostrarFormulario = false;
            }

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al inactivar el riesgo.';
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
            <h2>Gestión de Riesgos</h2>
            <p class="text-muted">
                Identificación y seguimiento del nivel de riesgo de los estudiantes.
            </p>
        </div>

        <button class="btn btn-primary" onclick={nuevoRiesgo}>
            + Registrar riesgo
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
                    {modoEdicion
                        ? 'Editar riesgo estudiantil'
                        : 'Registrar riesgo estudiantil'}
                </strong>
            </div>

            <div class="card-body">
                <form onsubmit={guardarRiesgo}>
                    <div class="row g-3">
                        <div class="col-md-6">
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

                        <div class="col-md-6">
                            <label for="score" class="form-label">
                                Puntaje de riesgo (0 a 100)
                            </label>

                            <input
                                id="score"
                                class="form-control"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                bind:value={score}
                                oninput={actualizarNivel}
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="nivel" class="form-label">
                                Nivel de riesgo
                            </label>

                            <input
                                id="nivel"
                                class="form-control"
                                value={nivel}
                                readonly
                            />

                            <div class="form-text">
                                Bajo (0–29), Medio (30–59), Alto (60–100).
                            </div>
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
                                    : 'Guardar riesgo'}
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
            <strong>Semáforo de riesgo estudiantil</strong>

            <button
                class="btn btn-sm btn-outline-primary"
                onclick={cargarDatos}
                disabled={cargando}
            >
                {cargando ? 'Cargando...' : 'Actualizar'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>

                    <p class="text-muted mt-2">Consultando riesgos...</p>
                </div>
            {:else if riesgos.length === 0}
                <div class="alert alert-info mb-0">
                    No hay riesgos registrados para mostrar.
                </div>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Estudiante</th>
                                <th>Puntaje</th>
                                <th>Nivel de riesgo</th>
                                <th>Fecha de cálculo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each riesgos as riesgo (riesgo.id_riesgo)}
                                <tr>
                                    <td>{riesgo.id_riesgo}</td>
                                    <td>{nombreEstudiante(riesgo)}</td>
                                    <td>{riesgo.score}</td>

                                    <td>
                                        <span class="badge {claseNivel(riesgo.nivel)}">
                                            {riesgo.nivel}
                                        </span>
                                    </td>

                                    <td>{formatearFecha(riesgo.fecha_calculo)}</td>

                                    <td>
                                        <div class="d-flex gap-2">
                                            <button
                                                class="btn btn-warning btn-sm"
                                                onclick={() => editarRiesgo(riesgo)}
                                                disabled={eliminando || guardando}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                class="btn btn-danger btn-sm"
                                                onclick={() => eliminarRiesgo(riesgo)}
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