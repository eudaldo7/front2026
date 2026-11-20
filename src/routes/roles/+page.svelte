
<svelte:head>
    <title>Roles | Alerta Temprana</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

    interface Rol {
        id_rol: number;
        nombre: string;
        descripcion?: string;
        estado?: boolean;
    }

    let roles = $state<Rol[]>([]);
    let nombre = $state('');
    let descripcion = $state('');

    let rolEditando = $state<number | null>(null);
    let mostrarFormulario = $state(false);
    let cargando = $state(false);
    let guardando = $state(false);
    let error = $state('');
    let mensaje = $state('');

    function obtenerSesion() {
        const token = localStorage.getItem('tokenAcceso');
        const usuarioTexto = localStorage.getItem('usuarioSesion');

        if (!token || !usuarioTexto) {
            throw new Error(
                'No hay una sesión válida. Cierra sesión e inicia sesión nuevamente.'
            );
        }

        let usuario: { id_usuario?: number };

        try {
            usuario = JSON.parse(usuarioTexto);
        } catch {
            throw new Error('No se pudo leer la sesión del usuario.');
        }

        if (!usuario.id_usuario) {
            throw new Error('La sesión no contiene un ID de usuario válido.');
        }

        return {
            token,
            idUsuario: usuario.id_usuario
        };
    }

    async function solicitarAPI(
        ruta: string,
        opciones: RequestInit = {}
    ): Promise<Response> {
        const { token } = obtenerSesion();

        const respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opciones.headers ?? {})
            }
        });

        if (respuesta.status === 401) {
            throw new Error(
                'La sesión expiró o el token no es válido. Inicia sesión nuevamente.'
            );
        }

        return respuesta;
    }

    async function obtenerError(respuesta: Response): Promise<string> {
        try {
            const datos = await respuesta.json();
            return datos.detail ?? datos.mensaje ?? `Error HTTP ${respuesta.status}`;
        } catch {
            return `Error HTTP ${respuesta.status}`;
        }
    }

    async function cargarRoles() {
        cargando = true;
        error = '';

        try {
            const { idUsuario } = obtenerSesion();

            const respuesta = await solicitarAPI(
                `/roles/?id_usuario=${idUsuario}`
            );

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            const datos = await respuesta.json();
            roles = Array.isArray(datos) ? datos : [];
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible cargar los roles.';
        } finally {
            cargando = false;
        }
    }

    function limpiarFormulario() {
        nombre = '';
        descripcion = '';
        rolEditando = null;
        mostrarFormulario = false;
    }

    function nuevoRol() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarRol(rol: Rol) {
        rolEditando = rol.id_rol;
        nombre = rol.nombre;
        descripcion = rol.descripcion ?? '';

        mostrarFormulario = true;
        error = '';
        mensaje = '';

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    async function guardarRol() {
        error = '';
        mensaje = '';

        if (!nombre.trim()) {
            error = 'Escribe el nombre del rol.';
            return;
        }

        guardando = true;

        try {
            const { idUsuario } = obtenerSesion();
            const editando = rolEditando !== null;

            const ruta = editando
                ? `/roles/${rolEditando}?id_usuario=${idUsuario}`
                : `/roles/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(ruta, {
                method: editando ? 'PUT' : 'POST',
                body: JSON.stringify({
                    nombre: nombre.trim(),
                    descripcion: descripcion.trim()
                })
            });

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            const resultado = await respuesta.json().catch(() => ({}));

            mensaje = resultado.mensaje ?? (
                editando
                    ? 'Rol actualizado correctamente.'
                    : 'Rol registrado correctamente.'
            );

            limpiarFormulario();
            await cargarRoles();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible guardar el rol.';
        } finally {
            guardando = false;
        }
    }

    async function inactivarRol(rol: Rol) {
        const confirmar = window.confirm(
            `¿Deseas inactivar el rol "${rol.nombre}"?`
        );

        if (!confirmar) return;

        error = '';
        mensaje = '';

        try {
            const { idUsuario } = obtenerSesion();

            const respuesta = await solicitarAPI(
                `/roles/${rol.id_rol}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            const resultado = await respuesta.json();

            mensaje = resultado.mensaje ?? 'Rol inactivado correctamente.';

            if (rolEditando === rol.id_rol) {
                limpiarFormulario();
            }

            await cargarRoles();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible inactivar el rol.';
        }
    }

    onMount(() => {
        cargarRoles();
    });
</script>

<div class="container-fluid px-4 py-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
            <h1 class="h3 fw-bold mb-2">Gestión de Roles</h1>
            <p class="text-muted mb-0">
                Administración de los roles del sistema.
            </p>
        </div>

        <button
            type="button"
            class="btn btn-primary"
            onclick={nuevoRol}
            disabled={cargando}
        >
            + Nuevo rol
        </button>
    </div>

    {#if mensaje}
        <div class="alert alert-success alert-dismissible" role="alert">
            {mensaje}
            <button
                type="button"
                class="btn-close"
                aria-label="Cerrar mensaje"
                onclick={() => mensaje = ''}
            ></button>
        </div>
    {/if}

    {#if error}
        <div class="alert alert-danger alert-dismissible" role="alert">
            {error}
            <button
                type="button"
                class="btn-close"
                aria-label="Cerrar mensaje"
                onclick={() => error = ''}
            ></button>
        </div>
    {/if}

    {#if mostrarFormulario}
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-primary text-white py-3">
                <h2 class="h5 mb-0">
                    {rolEditando !== null ? 'Editar rol' : 'Registrar nuevo rol'}
                </h2>
            </div>

            <div class="card-body p-4">
                <form onsubmit={(event) => {
                    event.preventDefault();
                    guardarRol();
                }}>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="nombre" class="form-label">
                                Nombre del rol
                            </label>
                            <input
                                id="nombre"
                                class="form-control"
                                bind:value={nombre}
                                maxlength="100"
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="descripcion" class="form-label">
                                Descripción
                            </label>
                            <input
                                id="descripcion"
                                class="form-control"
                                bind:value={descripcion}
                                maxlength="250"
                                placeholder="Funciones principales del rol"
                            />
                        </div>
                    </div>

                    <div class="d-flex gap-2 mt-4">
                        <button
                            type="submit"
                            class="btn btn-success"
                            disabled={guardando}
                        >
                            {guardando
                                ? 'Guardando...'
                                : rolEditando !== null
                                    ? 'Guardar cambios'
                                    : 'Registrar rol'}
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-secondary"
                            onclick={limpiarFormulario}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <div class="card shadow-sm border-0">
        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h2 class="h5 mb-0">Listado de roles</h2>

            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onclick={cargarRoles}
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
                    <p class="text-muted mt-2">Consultando roles...</p>
                </div>
            {:else if roles.length === 0}
                <div class="alert alert-info mb-0">
                    No hay roles registrados para mostrar.
                </div>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Nombre del rol</th>
                                <th>Descripción</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each roles as rol (rol.id_rol)}
                                <tr>
                                    <td>{rol.id_rol}</td>
                                    <td>{rol.nombre}</td>
                                    <td>{rol.descripcion || 'Sin descripción'}</td>
                                    <td>
                                        {#if rol.estado === false}
                                            <span class="badge text-bg-secondary">
                                                Inactivo
                                            </span>
                                        {:else}
                                            <span class="badge text-bg-success">
                                                Activo
                                            </span>
                                        {/if}
                                    </td>
                                    <td>
                                        <div class="d-flex gap-2">
                                            <button
                                                type="button"
                                                class="btn btn-sm btn-warning"
                                                onclick={() => editarRol(rol)}
                                                disabled={rol.estado === false}
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                class="btn btn-sm btn-danger"
                                                onclick={() => inactivarRol(rol)}
                                                disabled={rol.estado === false}
                                            >
                                                Inactivar
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
