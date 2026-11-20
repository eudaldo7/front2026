<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';

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

    interface Props {
        estudiantes?: Estudiante[];
        asistencias?: Asistencia[];
        riesgos?: Riesgo[];
        casos?: Caso[];
    }

    let {
        estudiantes = [],
        asistencias = [],
        riesgos = [],
        casos = []
    }: Props = $props();

    let canvasRiesgo: HTMLCanvasElement;
    let canvasAsistencia: HTMLCanvasElement;
    let canvasCursos: HTMLCanvasElement;
    let canvasCasos: HTMLCanvasElement;
    let canvasRiesgoCurso: HTMLCanvasElement;
    let canvasEvolucion: HTMLCanvasElement;

    let graficos: Chart[] = [];

    function esPresente(resultado: string): boolean {
        return ['presente', 'asistió', 'asistio'].includes(
            (resultado ?? '').trim().toLowerCase()
        );
    }

    function obtenerUltimosRiesgos(): Riesgo[] {
        const mapa = new Map<number, Riesgo>();

        for (const riesgo of riesgos) {
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

    function contarNivel(lista: Riesgo[], nivel: string): number {
        return lista.filter(
            (r) => r.nivel?.toLowerCase() === nivel
        ).length;
    }

    function agruparPorFecha(lista: Riesgo[]): { fechas: string[]; valores: number[] } {
        const conteo = new Map<string, number>();

        for (const riesgo of lista) {
            const fecha = riesgo.fecha_calculo?.slice(0, 10) || 'Sin fecha';
            conteo.set(fecha, (conteo.get(fecha) ?? 0) + 1);
        }

        const fechas = Array.from(conteo.keys()).sort();

        return {
            fechas,
            valores: fechas.map((fecha) => conteo.get(fecha) ?? 0)
        };
    }

    function actualizarGraficos(): void {
        if (graficos.length !== 6) return;

        const ultimosRiesgos = obtenerUltimosRiesgos();

        // 1. Distribución de riesgo: última evaluación por estudiante
        const niveles = [
            contarNivel(ultimosRiesgos, 'bajo'),
            contarNivel(ultimosRiesgos, 'medio'),
            contarNivel(ultimosRiesgos, 'alto')
        ];

        graficos[0].data.datasets[0].data = niveles;
        graficos[0].update();

        // 2. Asistencia
        const presentes = asistencias.filter((a) => esPresente(a.resultado)).length;
        const noPresentes = asistencias.length - presentes;

        graficos[1].data.datasets[0].data = [presentes, noPresentes];
        graficos[1].update();

        // 3. Estudiantes por curso
        const cursos = [...new Set(estudiantes.map((e) => e.curso || 'Sin curso'))].sort();
        const estudiantesPorCurso = cursos.map(
            (curso) => estudiantes.filter((e) => (e.curso || 'Sin curso') === curso).length
        );

        graficos[2].data.labels = cursos;
        graficos[2].data.datasets[0].data = estudiantesPorCurso;
        graficos[2].update();

        // 4. Estado de casos
        const activos = casos.filter((c) => c.estado !== false).length;
        const cerrados = casos.length - activos;

        graficos[3].data.datasets[0].data = [activos, cerrados];
        graficos[3].update();

        // 5. Riesgo por curso: última evaluación por estudiante
        const riesgoPorCurso = cursos.map((curso) => {
            const estudiantesCurso = new Set(
                estudiantes
                    .filter((e) => (e.curso || 'Sin curso') === curso)
                    .map((e) => e.id_estudiante)
            );

            return {
                bajo: ultimosRiesgos.filter(
                    (r) => estudiantesCurso.has(r.id_estudiante) && r.nivel?.toLowerCase() === 'bajo'
                ).length,
                medio: ultimosRiesgos.filter(
                    (r) => estudiantesCurso.has(r.id_estudiante) && r.nivel?.toLowerCase() === 'medio'
                ).length,
                alto: ultimosRiesgos.filter(
                    (r) => estudiantesCurso.has(r.id_estudiante) && r.nivel?.toLowerCase() === 'alto'
                ).length
            };
        });

        graficos[4].data.labels = cursos;
        graficos[4].data.datasets[0].data = riesgoPorCurso.map((r) => r.bajo);
        graficos[4].data.datasets[1].data = riesgoPorCurso.map((r) => r.medio);
        graficos[4].data.datasets[2].data = riesgoPorCurso.map((r) => r.alto);
        graficos[4].update();

        // 6. Evolución de evaluaciones: utiliza el historial del período filtrado
        const evolucion = agruparPorFecha(riesgos);

        graficos[5].data.labels = evolucion.fechas;
        graficos[5].data.datasets[0].data = evolucion.valores;
        graficos[5].update();
    }

    onMount(() => {
        graficos = [
            new Chart(canvasRiesgo, {
                type: 'bar',
                data: {
                    labels: ['Bajo', 'Medio', 'Alto'],
                    datasets: [{
                        label: 'Estudiantes',
                        data: [0, 0, 0],
                        backgroundColor: ['#22a06b', '#f0b429', '#d64545'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            }),

            new Chart(canvasAsistencia, {
                type: 'doughnut',
                data: {
                    labels: ['Presentes', 'No presentes'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#269b72', '#e5a33d'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            }),

            new Chart(canvasCursos, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Estudiantes',
                        data: [],
                        backgroundColor: '#4385d1',
                        borderRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            }),

            new Chart(canvasCasos, {
                type: 'doughnut',
                data: {
                    labels: ['Activos', 'Cerrados'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#d9534f', '#45a37a'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            }),

            new Chart(canvasRiesgoCurso, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        { label: 'Bajo', data: [], backgroundColor: '#22a06b' },
                        { label: 'Medio', data: [], backgroundColor: '#f0b429' },
                        { label: 'Alto', data: [], backgroundColor: '#d64545' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            }),

            new Chart(canvasEvolucion, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Evaluaciones registradas',
                        data: [],
                        backgroundColor: '#8064c8',
                        borderRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            })
        ];

        actualizarGraficos();

        return () => {
            graficos.forEach((grafico) => grafico.destroy());
            graficos = [];
        };
    });

    // Se actualizan las gráficas cuando cambian los datos o los filtros.
    $effect(() => {
        estudiantes;
        asistencias;
        riesgos;
        casos;
        actualizarGraficos();
    });
</script>

<section class="charts-section">
    <div class="section-heading mb-3">
        <h4>Análisis gráfico del sistema</h4>
        <p class="text-muted mb-0">
            Visualización de indicadores académicos y seguimiento del riesgo.
        </p>
    </div>

    <div class="row g-4">
        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Distribución del riesgo</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasRiesgo}></canvas>
                    </div>
                    <p class="chart-note">Se utiliza la evaluación más reciente de cada estudiante.</p>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Estado de asistencia</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasAsistencia}></canvas>
                    </div>
                    <p class="chart-note">Comparación de registros presentes y no presentes.</p>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Estudiantes por curso</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasCursos}></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Estado de los casos</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasCasos}></canvas>
                    </div>
                    <p class="chart-note">Casos activos y casos cerrados según su estado.</p>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Distribución del riesgo por curso</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasRiesgoCurso}></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card chart-card h-100">
                <div class="card-header">Evolución de evaluaciones de riesgo</div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas bind:this={canvasEvolucion}></canvas>
                    </div>
                    <p class="chart-note">Cantidad de evaluaciones registradas por fecha.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<style>
    .section-heading h4 {
        color: #17324d;
        font-weight: 800;
    }

    .chart-card {
        overflow: hidden;
        border: 1px solid #edf1f5;
        border-radius: 15px;
        box-shadow: 0 5px 20px rgba(23, 50, 77, 0.06);
    }

    .chart-card .card-header {
        padding: 16px 20px;
        border-bottom: 1px solid #edf1f5;
        background: #fff;
        color: #17324d;
        font-weight: 750;
    }

    .chart-card .card-body { padding: 20px; }

    .chart-container {
        position: relative;
        width: 100%;
        height: 280px;
    }

    .chart-note {
        margin: 12px 0 0;
        color: #8492a6;
        font-size: 0.8rem;
    }

    @media (max-width: 576px) {
        .chart-card .card-body { padding: 14px; }
        .chart-container { height: 240px; }
    }
</style>