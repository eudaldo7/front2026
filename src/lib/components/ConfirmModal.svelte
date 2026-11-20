<script lang="ts">
    interface Props {
        abierto: boolean;
        titulo?: string;
        mensaje: string;
        textoConfirmar?: string;
        textoCancelar?: string;
        peligro?: boolean;
        alConfirmar: () => void;
        alCancelar: () => void;
    }

    let {
        abierto,
        titulo = 'Confirmar acción',
        mensaje,
        textoConfirmar = 'Confirmar',
        textoCancelar = 'Cancelar',
        peligro = false,
        alConfirmar,
        alCancelar
    }: Props = $props();
</script>

{#if abierto}
    <div class="modal-backdrop-custom">
        <dialog
            open
            class="confirm-modal card"
            aria-labelledby="confirm-modal-titulo"
            aria-describedby="confirm-modal-mensaje"
        >
            <div class="card-body">
                <h2 id="confirm-modal-titulo" class="h5 mb-3">
                    {titulo}
                </h2>

                <p id="confirm-modal-mensaje" class="mb-4">
                    {mensaje}
                </p>

                <div class="d-flex justify-content-end gap-2">
                    <button
                        type="button"
                        class="btn btn-outline-secondary"
                        onclick={alCancelar}
                    >
                        {textoCancelar}
                    </button>

                    <button
                        type="button"
                        class={peligro ? 'btn btn-danger' : 'btn btn-primary'}
                        onclick={alConfirmar}
                    >
                        {textoConfirmar}
                    </button>
                </div>
            </div>
        </dialog>
    </div>
{/if}

<style>
    .modal-backdrop-custom {
        position: fixed;
        inset: 0;
        z-index: 1050;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgb(0 0 0 / 50%);
    }

    .confirm-modal {
        position: static;
        margin: 0;
        width: 100%;
        max-width: 440px;
        border: 0;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgb(0 0 0 / 20%);
    }
</style>