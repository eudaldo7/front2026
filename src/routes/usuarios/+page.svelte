
<svelte:head>
    <title>Usuarios | Alerta Temprana</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

    interface Usuario {
        id_usuario: number;
        nombre: string;
        apellido: string;
        correo: string;
        id_rol: number;
        estado?: boolean;
    }

    interface Rol {
        id_rol: number;
        nombre: string;
    }

    let usuarios = $state<Usuario[]>([]);
    let roles = $state<Rol[]>([]);

    let nombre = $state('');
    let apellido = $state('');
    let correo = $state('');
    let contrasena = $state('');
    let idRol = $state('');

    let usuarioEditando = $state<number | null>(null);
    let mostrarFormulario = $state(false);
    let cargando = $state(false);
    let guardando = $state(false);
    let error = $state('');
    let mensaje = $state('');

    function obtenerSesion() {
        if (typeof localStorage === 'undefined') {
            throw new Error('No se puede acceder a la sesión.');
        }

        const token = localStorage.getItem('tokenAcceso');
        const usuarioTexto = localStorage.getItem('usuarioSesion');

        if (!token || !usuarioTexto) {
            throw new Error(
                'Tu sesión no está autenticada. Cierra sesión e inicia sesión nuevamente.'
            );
        }

        let usuario: { id_usuario?: number };

        try {
            usuario = JSON.parse(usuarioTexto);
        } catch {
            throw new Error(
                'No se pudo leer la sesión. Cierra sesión e inicia sesión nuevamente.'
            );
        }

        if (!usuario.id_usuario) {
            throw new Error('La sesión no contiene un ID de usuario válido.');
        }

        return {
            token,
            idUsuario: usuario.id_usuario
        };
    }

    function crearCabeceras(): HeadersInit {
        const { token } = obtenerSesion();

        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async function solicitarAPI(
        ruta: string,
        opciones: RequestInit = {}
    ): Promise<Response> {
        const cabeceras = crearCabeceras();

        const respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: {
                ...cabeceras,
                ...(opciones.headers ?? {})
            }
        });

        if (respuesta.status === 401) {
            throw new Error(
                'La sesión expiró o el token no es válido. Cierra sesión e inicia sesión nuevamente.'
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

    function nombreRol(id: number): string {
        const rol = roles.find((r) => r.id_rol === id);
        return rol?.nombre ?? `Rol #${id}`;
    }

    async function cargarDatos() {
        cargando = true;
        error = '';

        try {
            const { idUsuario } = obtenerSesion();

            const [respuestaUsuarios, respuestaRoles] = await Promise.all([
                solicitarAPI(`/usuarios/?id_usuario=${idUsuario}`),
                solicitarAPI(`/roles/?id_usuario=${idUsuario}`)
            ]);

            if (!respuestaUsuarios.ok) {
                throw new Error(await obtenerError(respuestaUsuarios));
            }

            if (!respuestaRoles.ok) {
                throw new Error(await obtenerError(respuestaRoles));
            }

            const datosUsuarios = await respuestaUsuarios.json();
            const datosRoles = await respuestaRoles.json();

            usuarios = Array.isArray(datosUsuarios) ? datosUsuarios : [];
            roles = Array.isArray(datosRoles) ? datosRoles : [];
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible cargar los usuarios.';
        } finally {
            cargando = false;
        }
    }

    function limpiarFormulario() {
        nombre = '';
        apellido = '';
        correo = '';
        contrasena = '';
        idRol = '';
        usuarioEditando = null;
        mostrarFormulario = false;
    }

    function nuevoUsuario() {
        limpiarFormulario();
        error = '';
        mensaje = '';
        mostrarFormulario = true;
    }

    function editarUsuario(usuario: Usuario) {
        usuarioEditando = usuario.id_usuario;
        nombre = usuario.nombre;
        apellido = usuario.apellido;
        correo = usuario.correo;
        idRol = String(usuario.id_rol);
        contrasena = '';

        error = '';
        mensaje = '';
        mostrarFormulario = true;

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    async function guardarUsuario() {
        error = '';
        mensaje = '';

        if (!nombre.trim() || !apellido.trim() || !correo.trim() || !idRol) {
            error = 'Completa el nombre, apellido, correo y rol.';
            return;
        }

        if (usuarioEditando === null && !contrasena) {
            error = 'Debes ingresar una contraseña para el nuevo usuario.';
            return;
        }

        if (contrasena && contrasena.length < 8) {
            error = 'La contraseña debe tener al menos 8 caracteres.';
            return;
        }

        const datos: Record<string, string | number> = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo: correo.trim(),
            id_rol: Number(idRol)
        };

        if (contrasena) {
            datos['contraseña'] = contrasena;
        } else if (usuarioEditando !== null) {
            error = 'Para editar este usuario, ingresa su contraseña actual o una nueva contraseña válida.';
            return;
        }

        guardando = true;

        try {
            const { idUsuario } = obtenerSesion();
            const editando = usuarioEditando !== null;

            const url = editando
                ? `/usuarios/${usuarioEditando}?id_usuario=${idUsuario}`
                : `/usuarios/?id_usuario=${idUsuario}`;

            const respuesta = await solicitarAPI(url, {
                method: editando ? 'PUT' : 'POST',
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            mensaje = editando
                ? 'Usuario actualizado correctamente.'
                : 'Usuario registrado correctamente.';

            limpiarFormulario();
            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible guardar el usuario.';
        } finally {
            guardando = false;
        }
    }

    async function inactivarUsuario(usuario: Usuario) {
        const confirmar = window.confirm(
            `¿Deseas inactivar al usuario ${usuario.nombre} ${usuario.apellido}?`
        );

        if (!confirmar) return;

        error = '';
        mensaje = '';

        try {
            const { idUsuario } = obtenerSesion();

            const respuesta = await solicitarAPI(
                `/usuarios/${usuario.id_usuario}?id_usuario=${idUsuario}`,
                { method: 'DELETE' }
            );

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            const resultado = await respuesta.json();
            mensaje = resultado.mensaje ?? 'Usuario inactivado correctamente.';

            if (usuarioEditando === usuario.id_usuario) {
                limpiarFormulario();
            }

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible inactivar el usuario.';
        }
    }

    async function reactivarUsuario(usuario: Usuario) {
        const confirmar = window.confirm(
            `¿Deseas reactivar al usuario ${usuario.nombre} ${usuario.apellido}?`
        );

        if (!confirmar) return;

        error = '';
        mensaje = '';

        try {
            const { idUsuario } = obtenerSesion();

            const respuesta = await solicitarAPI(
                `/usuarios/${usuario.id_usuario}/activar?id_usuario=${idUsuario}`,
                { method: 'PUT' }
            );

            if (!respuesta.ok) {
                throw new Error(await obtenerError(respuesta));
            }

            const resultado = await respuesta.json();
            mensaje = resultado.mensaje ?? 'Usuario activado correctamente.';

            await cargarDatos();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'No fue posible reactivar el usuario.';
        }
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<div class="container-fluid px-4 py-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
            <h1 class="h3 fw-bold mb-2">Gestión de Usuarios</h1>
            <p class="text-muted mb-0">
                Administración de usuarios, roles y estados del sistema.
            </p>
        </div>

        <button
            class="btn btn-primary"
            onclick={nuevoUsuario}
            disabled={cargando}
        >
            + Nuevo usuario
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
                    {usuarioEditando !== null
                        ? 'Editar usuario'
                        : 'Registrar nuevo usuario'}
                </h2>
            </div>

            <div class="card-body p-4">
                <form onsubmit={(event) => {
                    event.preventDefault();
                    guardarUsuario();
                }}>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label for="nombre" class="form-label">Nombre</label>
                            <input
                                id="nombre"
                                class="form-control"
                                bind:value={nombre}
                                maxlength="100"
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="apellido" class="form-label">Apellido</label>
                            <input
                                id="apellido"
                                class="form-control"
                                bind:value={apellido}
                                maxlength="100"
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="correo" class="form-label">Correo electrónico</label>
                            <input
                                id="correo"
                                type="email"
                                class="form-control"
                                bind:value={correo}
                                required
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="contrasena" class="form-label">
                                {usuarioEditando !== null
                                    ? 'Contraseña (obligatoria para guardar cambios)'
                                    : 'Contraseña'}
                            </label>
                            <input
                                id="contrasena"
                                type="password"
                                class="form-control"
                                bind:value={contrasena}
                                minlength="8"
                                autocomplete="new-password"
                                required
                                placeholder="Mínimo 8 caracteres"
                            />
                        </div>

                        <div class="col-md-6">
                            <label for="rol" class="form-label">Rol</label>
                            <select
                                id="rol"
                                class="form-select"
                                bind:value={idRol}
                                required
                            >
                                <option value="">Selecciona un rol</option>

                                {#each roles as rol (rol.id_rol)}
                                    <option value={String(rol.id_rol)}>
                                        {rol.nombre}
                                    </option>
                                {/each}
                            </select>

                            {#if roles.length === 0}
                                <small class="text-danger">
                                    No hay roles disponibles.
                                </small>
                            {/if}
                        </div>
                    </div>

                    <div class="d-flex gap-2 mt-4">
                        <button
                            type="submit"
                            class="btn btn-success"
                            disabled={guardando || roles.length === 0}
                        >
                            {guardando
                                ? 'Guardando...'
                                : usuarioEditando !== null
                                    ? 'Guardar cambios'
                                    : 'Registrar usuario'}
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
        <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
            <h2 class="h5 mb-0">Listado de usuarios</h2>

            <button
                class="btn btn-outline-primary btn-sm"
                onclick={cargarDatos}
                disabled={cargando}
            >
                {cargando ? 'Cargando...' : 'Actualizar lista'}
            </button>
        </div>

        <div class="card-body">
            {#if cargando}
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted mt-3">Consultando usuarios...</p>
                </div>
            {:else if usuarios.length === 0}
                <div class="alert alert-info mb-0">
                    No hay usuarios registrados para mostrar.
                </div>
            {:else}
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Apellido</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each usuarios as usuario (usuario.id_usuario)}
                                <tr>
                                    <td>{usuario.id_usuario}</td>
                                    <td>{usuario.nombre}</td>
                                    <td>{usuario.apellido}</td>
                                    <td>{usuario.correo}</td>
                                    <td>{nombreRol(usuario.id_rol)}</td>
                                    <td>
                                        {#if usuario.estado === false}
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
                                            {#if usuario.estado === false}
                                                <button
                                                    type="button"
                                                    class="btn btn-sm btn-success"
                                                    onclick={() => reactivarUsuario(usuario)}
                                                >
                                                    Reactivar
                                                </button>
                                            {:else}
                                                <button
                                                    type="button"
                                                    class="btn btn-sm btn-warning"
                                                    onclick={() => editarUsuario(usuario)}
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    class="btn btn-sm btn-danger"
                                                    onclick={() => inactivarUsuario(usuario)}
                                                >
                                                    Inactivar
                                                </button>
                                            {/if}
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
