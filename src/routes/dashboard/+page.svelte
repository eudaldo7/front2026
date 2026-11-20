<svelte:head>
    <title>Dashboard - Alerta Temprana</title>
    <meta name="description" content="Panel de seguimiento académico y prevención de la deserción escolar." />
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import GraficosDashboard from '$lib/components/dashboard/GraficosDashboard.svelte';

    const API_URL = 'http://127.0.0.1:8001';

    interface Estudiante {
        id_estudiante: number;
        nombre: string;
        apellido: string;
        curso: string;
    }

    interface Asistencia {
        id_asistencia: number;
        id_estudiante: number;
        resultado: string;
        fecha: string;
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

    interface Usuario {
        id_usuario: number;
        nombre?: string;
        apellido?: string;
        correo?: string;
        id_rol?: number;
        rol?: string;
    }

    interface EstudianteEnRiesgo extends Estudiante {
        nivel: string;
        score: number | null;
        asistencia: number | null;
        estado: string;
    }

    let estudiantes: Estudiante[] = $state([]);
    let asistencias: Asistencia[] = $state([]);
    let riesgos: Riesgo[] = $state([]);
    let casos: Caso[] = $state([]);

    let usuario = $state<Usuario | null>(null);
    let cargando = $state(false);
    let error = $state('');

    // Filtros del Dashboard
    let cursoSeleccionado = $state('todos');
    let fechaDesde = $state('');
    let fechaHasta = $state('');

    const cursosDisponibles = $derived(
        [...new Set(estudiantes.map((e) => e.curso).filter(Boolean))].sort()
    );

    function fechaEnRango(fecha: string | undefined): boolean {
        if (!fecha) return !fechaDesde && !fechaHasta;

        const dia = fecha.slice(0, 10);

        if (fechaDesde && dia < fechaDesde) return false;
        if (fechaHasta && dia > fechaHasta) return false;

        return true;
    }

    const estudiantesFiltrados = $derived(
        estudiantes.filter((e) =>
            cursoSeleccionado === 'todos' || e.curso === cursoSeleccionado
        )
    );

    const idsFiltrados = $derived(
        new Set(estudiantesFiltrados.map((e) => e.id_estudiante))
    );

    const asistenciasFiltradas = $derived(
        asistencias.filter((a) =>
            idsFiltrados.has(a.id_estudiante) && fechaEnRango(a.fecha)
        )
    );

    const riesgosFiltrados = $derived(
        riesgos.filter((r) =>
            idsFiltrados.has(r.id_estudiante) && fechaEnRango(r.fecha_calculo)
        )
    );

    const casosFiltrados = $derived(
        casos.filter((c) =>
            idsFiltrados.has(c.id_estudiante) && fechaEnRango(c.fecha_apertura)
        )
    );

    function obtenerUltimosRiesgos(lista: Riesgo[]): Riesgo[] {
        const mapa = new Map<number, Riesgo>();

        for (const riesgo of lista) {
            const anterior = mapa.get(riesgo.id_estudiante);

            if (
                !anterior ||
                (riesgo.fecha_calculo ?? '') > (anterior.fecha_calculo ?? '')
            ) {
                mapa.set(riesgo.id_estudiante, riesgo);
            }
        }

        return Array.from(mapa.values());
    }

    const riesgosActuales = $derived(
        obtenerUltimosRiesgos(riesgosFiltrados)
    );

    const totalEstudiantes = $derived(estudiantesFiltrados.length);

    const riesgosBajos = $derived(
        riesgosActuales.filter((r) => r.nivel?.toLowerCase() === 'bajo').length
    );

    const riesgosMedios = $derived(
        riesgosActuales.filter((r) => r.nivel?.toLowerCase() === 'medio').length
    );

    const riesgosAltos = $derived(
        riesgosActuales.filter((r) => r.nivel?.toLowerCase() === 'alto').length
    );

    const totalCasosActivos = $derived(
        casosFiltrados.filter((c) => c.estado !== false).length
    );

    function esPresente(resultado: string): boolean {
        return ['presente', 'asistió', 'asistio'].includes(
            (resultado ?? '').trim().toLowerCase()
        );
    }

    const porcentajeAsistencia = $derived(
        asistenciasFiltradas.length
            ? Math.round(
                (asistenciasFiltradas.filter((a) => esPresente(a.resultado)).length /
                    asistenciasFiltradas.length) * 100
            )
            : 0
    );

    const estudiantesEnRiesgo = $derived.by((): EstudianteEnRiesgo[] => {
        return estudiantesFiltrados
            .map((estudiante) => {
                const riesgo = riesgosActuales.find(
                    (r) => r.id_estudiante === estudiante.id_estudiante
                );

                const registros = asistenciasFiltradas.filter(
                    (a) => a.id_estudiante === estudiante.id_estudiante
                );

                const presentes = registros.filter((a) =>
                    esPresente(a.resultado)
                ).length;

                const porcentaje = registros.length
                    ? Math.round((presentes / registros.length) * 100)
                    : null;

                const casoActivo = casosFiltrados.some(
                    (c) =>
                        c.id_estudiante === estudiante.id_estudiante &&
                        c.estado !== false
                );

                return {
                    ...estudiante,
                    nivel: riesgo?.nivel ?? 'Sin evaluar',
                    score: riesgo?.score ?? null,
                    asistencia: porcentaje,
                    estado: casoActivo ? 'Caso activo' : 'Sin caso activo'
                };
            })
            .filter((e) =>
                ['alto', 'medio'].includes(e.nivel.toLowerCase())
            )
            .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    });

    function obtenerToken(): string | null {
        return localStorage.getItem('tokenAcceso');
    }

    function obtenerUsuario(): Usuario | null {
        const guardado = localStorage.getItem('usuarioSesion');
        if (!guardado) return null;

        try {
            const datos = JSON.parse(guardado);
            const idUsuario = Number(datos?.id_usuario);

            if (!Number.isInteger(idUsuario) || idUsuario <= 0) return null;

            return { ...datos, id_usuario: idUsuario } as Usuario;
        } catch {
            return null;
        }
    }

    function cerrarSesionLocal(): void {
        localStorage.removeItem('tokenAcceso');
        localStorage.removeItem('usuarioSesion');
        window.location.href = '/';
    }

    function claseNivel(nivel: string): string {
        switch (nivel.toLowerCase()) {
            case 'bajo': return 'text-bg-success';
            case 'medio': return 'text-bg-warning';
            case 'alto': return 'text-bg-danger';
            default: return 'text-bg-secondary';
        }
    }

    async function consultarAPI<T>(ruta: string): Promise<T> {
        const token = obtenerToken();

        if (!token) {
            throw new Error('No se encontró la sesión. Inicia sesión nuevamente.');
        }

        const respuesta = await fetch(`${API_URL}${ruta}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        if (respuesta.status === 401) {
            cerrarSesionLocal();
            throw new Error('La sesión venció. Inicia sesión nuevamente.');
        }

        if (respuesta.status === 403) {
            throw new Error('No tienes permisos para consultar esta información.');
        }

        if (!respuesta.ok) {
            let mensaje = `Error al consultar ${ruta}. Código: ${respuesta.status}.`;

            try {
                const datos = await respuesta.json();
                if (datos.detail) {
                    mensaje = typeof datos.detail === 'string'
                        ? datos.detail
                        : JSON.stringify(datos.detail);
                }
            } catch {
                // Se conserva el mensaje predeterminado.
            }

            throw new Error(mensaje);
        }

        return (await respuesta.json()) as T;
    }

    async function cargarDashboard(): Promise<void> {
        cargando = true;
        error = '';

        try {
            const token = obtenerToken();

            if (!token) {
                throw new Error('No se encontró el token de sesión. Inicia sesión nuevamente.');
            }

            usuario = obtenerUsuario();

            if (!usuario) {
                throw new Error('No se encontró la información del usuario. Vuelve a iniciar sesión.');
            }

            const idUsuario = usuario.id_usuario;

            const [
                datosEstudiantes,
                datosAsistencias,
                datosRiesgos,
                datosCasos
            ] = await Promise.all([
                consultarAPI<Estudiante[]>(`/estudiantes/?id_usuario=${idUsuario}`),
                consultarAPI<Asistencia[]>(`/asistencias/?id_usuario=${idUsuario}`),
                consultarAPI<Riesgo[]>(`/riesgos/?id_usuario=${idUsuario}`),
                consultarAPI<Caso[]>(`/casos/?id_usuario=${idUsuario}`)
            ]);

            estudiantes = Array.isArray(datosEstudiantes) ? datosEstudiantes : [];
            asistencias = Array.isArray(datosAsistencias) ? datosAsistencias : [];
            riesgos = Array.isArray(datosRiesgos) ? datosRiesgos : [];
            casos = Array.isArray(datosCasos) ? datosCasos : [];

        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Ocurrió un error al cargar el dashboard.';
        } finally {
            cargando = false;
        }
    }

    function limpiarFiltros(): void {
        cursoSeleccionado = 'todos';
        fechaDesde = '';
        fechaHasta = '';
    }

    onMount(() => {
        void cargarDashboard();
    });
</script>

<div class="container-fluid dashboard-container mt-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
            <h2 class="dashboard-title">Dashboard</h2>
            <p class="text-muted mb-0">
                Resumen general del seguimiento y riesgo de deserción escolar.
            </p>
        </div>

        <button
            class="btn btn-outline-primary"
            onclick={cargarDashboard}
            disabled={cargando}
        >
            {cargando ? 'Actualizando...' : '↻ Actualizar'}
        </button>
    </div>

    {#if usuario}
        <p class="text-muted small">
            Sesión: {usuario.nombre ?? ''} {usuario.apellido ?? ''}
            {#if usuario.rol} · Rol: {usuario.rol}{/if}
        </p>
    {/if}

    {#if error}
        <div class="alert alert-danger" role="alert">
            <strong>No fue posible cargar el Dashboard.</strong>
            <p class="mb-2">{error}</p>
            <button class="btn btn-sm btn-outline-danger" onclick={cargarDashboard}>
                Reintentar
            </button>
        </div>
    {/if}

    {#if cargando}
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-3">Consultando información del sistema...</p>
        </div>
    {:else}
        <!-- FILTROS -->
        <section class="filter-panel mb-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                    <h5 class="mb-1">Filtros del tablero</h5>
                    <small>Selecciona los criterios para consultar la información.</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary" onclick={limpiarFiltros}>
                    Limpiar filtros
                </button>
            </div>

            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <label for="filtroCurso" class="form-label">Curso</label>
                    <select id="filtroCurso" class="form-select" bind:value={cursoSeleccionado}>
                        <option value="todos">Todos los cursos</option>
                        {#each cursosDisponibles as curso}
                            <option value={curso}>{curso}</option>
                        {/each}
                    </select>
                </div>

                <div class="col-12 col-md-4">
                    <label for="fechaDesde" class="form-label">Fecha desde</label>
                    <input id="fechaDesde" type="date" class="form-control" bind:value={fechaDesde} />
                </div>

                <div class="col-12 col-md-4">
                    <label for="fechaHasta" class="form-label">Fecha hasta</label>
                    <input id="fechaHasta" type="date" class="form-control" bind:value={fechaHasta} min={fechaDesde || undefined} />
                </div>
            </div>
        </section>

        <!-- INDICADORES -->
        <div class="row g-4 mb-4">
            <div class="col-12 col-sm-6 col-xl-3">
                <div class="card indicator-card border-primary h-100">
                    <div class="card-body">
                        <div class="indicator-icon icon-blue">🎓</div>
                        <p class="indicator-label">Total de estudiantes</p>
                        <h2>{totalEstudiantes}</h2>
                        <p class="indicator-description">Estudiantes registrados</p>
                    </div>
                </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
                <div class="card indicator-card border-success h-100">
                    <div class="card-body">
                        <div class="indicator-icon icon-green">📅</div>
                        <p class="indicator-label">Asistencia</p>
                        <h2>{porcentajeAsistencia}%</h2>
                        <p class="indicator-description">De los registros consultados</p>
                    </div>
                </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
                <div class="card indicator-card border-warning h-100">
                    <div class="card-body">
                        <div class="indicator-icon icon-yellow">⚠️</div>
                        <p class="indicator-label">Riesgo medio</p>
                        <h2>{riesgosMedios}</h2>
                        <p class="indicator-description">Requieren seguimiento</p>
                    </div>
                </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
                <div class="card indicator-card border-danger h-100">
                    <div class="card-body">
                        <div class="indicator-icon icon-red">🚨</div>
                        <p class="indicator-label">Riesgo alto</p>
                        <h2>{riesgosAltos}</h2>
                        <p class="indicator-description">Atención prioritaria</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- GRÁFICAS -->
        <GraficosDashboard
            estudiantes={estudiantesFiltrados}
            asistencias={asistenciasFiltradas}
            riesgos={riesgosFiltrados}
            casos={casosFiltrados}
        />

        <!-- TABLA DE ESTUDIANTES -->
        <div class="card panel-card mt-4 mb-4">
            <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <strong>Estudiantes que requieren atención</strong>
                <span class="badge text-bg-danger">
                    {estudiantesEnRiesgo.length} estudiantes
                </span>
            </div>

            <div class="card-body">
                {#if estudiantesEnRiesgo.length === 0}
                    <div class="empty-state">
                        <div class="empty-icon">✅</div>
                        <h5>No hay estudiantes en riesgo medio o alto</h5>
                        <p class="text-muted mb-0">
                            Verifica que existan evaluaciones de riesgo para los filtros seleccionados.
                        </p>
                    </div>
                {:else}
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Curso</th>
                                    <th>Asistencia</th>
                                    <th>Riesgo</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each estudiantesEnRiesgo as estudiante (estudiante.id_estudiante)}
                                    <tr>
                                        <td>
                                            <strong>{estudiante.nombre} {estudiante.apellido}</strong>
                                        </td>
                                        <td>{estudiante.curso}</td>
                                        <td>
                                            {estudiante.asistencia === null
                                                ? 'Sin registros'
                                                : `${estudiante.asistencia}%`}
                                        </td>
                                        <td>
                                            <span class="badge {claseNivel(estudiante.nivel)}">
                                                {estudiante.nivel}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                class="status-label"
                                                class:status-active={estudiante.estado === 'Caso activo'}
                                            >
                                                {estudiante.estado}
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
    {/if}
</div>

<style>
    .dashboard-container {
        max-width: 1600px;
        padding: 0 22px 35px;
    }

    .dashboard-title {
        color: #17324d;
        font-weight: 800;
    }

    .indicator-card,
    .panel-card {
        overflow: hidden;
        border-radius: 15px;
        box-shadow: 0 5px 20px rgba(23, 50, 77, 0.06);
    }

    .indicator-card {
        border-width: 0 0 0 4px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .indicator-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(23, 50, 77, 0.1);
    }

    .indicator-card .card-body { padding: 22px; }

    .indicator-icon {
        display: grid;
        width: 45px;
        height: 45px;
        place-items: center;
        margin-bottom: 17px;
        border-radius: 12px;
        font-size: 21px;
    }

    .icon-blue { background: #e5f1ff; }
    .icon-green { background: #e2f7ec; }
    .icon-yellow { background: #fff4d6; }
    .icon-red { background: #ffe8e8; }

    .indicator-label {
        margin-bottom: 5px;
        color: #64748b;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .indicator-card h2 {
        margin: 0;
        color: #17324d;
        font-size: 2.1rem;
        font-weight: 800;
    }

    .indicator-description {
        margin: 8px 0 0;
        color: #8492a6;
        font-size: 0.82rem;
    }

    .filter-panel {
        padding: 22px;
        border: 1px solid #e5ddfa;
        border-left: 5px solid #8064c8;
        border-radius: 14px;
        background: #f8f6ff;
    }

    .filter-panel h5 {
        color: #463276;
        font-weight: 750;
    }

    .filter-panel small { color: #756b8e; }
    .filter-panel .form-label { color: #51416f; font-weight: 650; }

    .panel-card .card-header {
        padding: 17px 20px;
        border-bottom: 1px solid #edf1f5;
        background: #fff;
        color: #17324d;
    }

    .panel-card .card-body { padding: 22px; }

    .empty-state { padding: 35px 15px; text-align: center; }
    .empty-icon { margin-bottom: 12px; font-size: 2.5rem; }
    .empty-state h5 { color: #17324d; font-weight: 700; }

    .table thead th {
        padding: 14px;
        background: #f5f8fc;
        color: #526579;
        font-size: 0.82rem;
        font-weight: 700;
        white-space: nowrap;
    }

    .table tbody td {
        padding: 14px;
        color: #344054;
        font-size: 0.9rem;
    }

    .status-label {
        display: inline-block;
        padding: 5px 9px;
        border-radius: 7px;
        background: #f0f2f5;
        color: #526579;
        font-size: 0.78rem;
        white-space: nowrap;
    }

    .status-active { background: #fff0f0; color: #b42318; }

    @media (max-width: 576px) {
        .dashboard-container { padding: 0 12px 25px; }
        .indicator-card .card-body { padding: 17px; }
        .panel-card .card-body { padding: 16px; }
        .filter-panel { padding: 16px; }
    }
</style>