
<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Columna {
        clave: string;
        titulo: string;
    }

    type Fila = Record<string, unknown>;

    interface Props {
        columnas: Columna[];
        filas: Fila[];
        claveFila?: string;
        mensajeVacio?: string;
        rayada?: boolean;
        acciones?: Snippet<[Fila]>;
        celdaPersonalizada?: Snippet<[Fila, string]>;
    }

    let {
        columnas,
        filas,
        claveFila,
        mensajeVacio = 'No hay registros para mostrar.',
        rayada = false,
        acciones,
        celdaPersonalizada
    }: Props = $props();
</script>

<div class="table-responsive">
    <table
        class="table table-hover align-middle"
        class:table-striped={rayada}
    >
        <thead class="table-dark">
            <tr>
                {#each columnas as columna (columna.clave)}
                    <th scope="col">{columna.titulo}</th>
                {/each}
            </tr>
        </thead>

        <tbody>
            {#if filas.length > 0}
                {#each filas as fila, indice (claveFila ? fila[claveFila] : indice)}
                    <tr>
                        {#each columnas as columna (columna.clave)}
                            <td>
                                {#if columna.clave === 'acciones' && acciones}
                                    {@render acciones(fila)}
                                {:else if celdaPersonalizada}
                                    {@render celdaPersonalizada(fila, columna.clave)}
                                {:else}
                                    {fila[columna.clave] == null
                                        ? '—'
                                        : String(fila[columna.clave])}
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}
            {:else}
                <tr>
                    <td
                        colspan={Math.max(columnas.length, 1)}
                        class="text-center text-muted py-4"
                    >
                        {mensajeVacio}
                    </td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>

<style>
    .table thead th {
        padding: 14px;
        background: #1769aa;
        color: #fff;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    .table tbody td {
        padding: 13px;
        font-size: 0.9rem;
        vertical-align: middle;
    }
</style>

