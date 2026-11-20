<script lang="ts">
    interface Props {
        valor?: string;
        placeholder?: string;
        etiqueta?: string;
        alBuscar: (valor: string) => void;
    }

    let {
        valor = $bindable(''),
        placeholder = 'Buscar registros...',
        etiqueta = 'Buscar',
        alBuscar
    }: Props = $props();
</script>

<div class="search-bar mb-3">
    <label class="form-label" for="campo-busqueda">
        {etiqueta}
    </label>

    <input
        id="campo-busqueda"
        class="form-control"
        type="search"
        bind:value={valor}
        {placeholder}
        oninput={() => alBuscar(valor)}
    />
</div>

<style>
    .search-bar {
        width: 100%;
        max-width: 420px;
    }

    .search-bar .form-label {
        font-weight: 600;
        font-size: 0.9rem;
    }
</style>
