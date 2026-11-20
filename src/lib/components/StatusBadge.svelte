<script lang="ts">
    type Estado = 'activo' | 'inactivo' | 'pendiente' | 'completado' | 'riesgo';

    interface Props {
        texto: string;
        estado?: Estado;
    }

    let {
        texto,
        estado = 'activo'
    }: Props = $props();

    const clases: Record<Estado, string> = {
        activo: 'text-bg-success',
        inactivo: 'text-bg-secondary',
        pendiente: 'text-bg-warning',
        completado: 'text-bg-primary',
        riesgo: 'text-bg-danger'
    };
</script>

<span class={`badge rounded-pill ${clases[estado]}`}>
    {texto}
</span>