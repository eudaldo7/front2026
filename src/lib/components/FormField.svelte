<script lang="ts">
    interface Props {
        id: string;
        etiqueta: string;
        valor?: string | number;
        tipo?: string;
        placeholder?: string;
        requerido?: boolean;
        deshabilitado?: boolean;
    }

    let {
        id,
        etiqueta,
        valor = $bindable<string | number>(''),
        tipo = 'text',
        placeholder = '',
        requerido = false,
        deshabilitado = false
    }: Props = $props();
</script>

<div class="form-field mb-3">
    <label class="form-label" for={id}>
        {etiqueta}

        {#if requerido}
            <span class="text-danger" aria-hidden="true">*</span>
        {/if}
    </label>

    <input
        class="form-control"
        {id}
        type={tipo}
        bind:value={valor}
        {placeholder}
        required={requerido}
        disabled={deshabilitado}
    />
</div>

<style>
    .form-field .form-label {
        font-weight: 600;
        font-size: 0.9rem;
    }

    .form-field .form-control {
        border-radius: 8px;
    }
</style>