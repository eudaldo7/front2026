<script lang="ts">
    interface Props {
        titulo: string;
        subtitulo?: string;
    }

    let {
        titulo,
        subtitulo = ''
    }: Props = $props();
</script>

<section class="page-title mb-4">
    <h1>{titulo}</h1>

    {#if subtitulo}
        <p class="text-muted mb-0">{subtitulo}</p>
    {/if}
</section>

<style>
    .page-title h1 {
        font-size: 1.75rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .page-title p {
        font-size: 0.95rem;
    }
</style>
