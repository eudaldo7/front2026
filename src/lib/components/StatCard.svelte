<script lang="ts">
    interface Props {
        titulo: string;
        valor: string | number;
        descripcion?: string;
    }

    let {
        titulo,
        valor,
        descripcion = ''
    }: Props = $props();
</script>

<article class="stat-card card h-100">
    <div class="card-body">
        <h2 class="stat-title">{titulo}</h2>

        <p class="stat-value">{valor}</p>

        {#if descripcion}
            <p class="stat-description text-muted mb-0">
                {descripcion}
            </p>
        {/if}
    </div>
</article>

<style>
    .stat-card {
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
    }

    .stat-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        overflow-wrap: anywhere;
    }

    .stat-description {
        font-size: 0.85rem;
    }
</style>
