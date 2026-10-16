
<script lang="ts">
	import { onMount } from 'svelte';

	const API_URL = 'http://127.0.0.1:8001';
	const ID_USUARIO = 1;

	interface Evidencia {
		id_evidencia: number;
		id_seguimiento: number;
		nombre: string;
		descripcion: string;
		fecha: string;
		estado: boolean;
	}

	interface Seguimiento {
		id_seguimiento: number;
		id_caso?: number;
		fecha?: string;
		observacion?: string;
		estado?: boolean;
	}

	let evidencias: Evidencia[] = [];
	let seguimientos: Seguimiento[] = [];

	let idSeguimiento = '';
	let nombre = '';
	let descripcion = '';
	let fecha = '';

	let evidenciaEditando: number | null = null;
	let cargando = true;
	let guardando = false;
	let mensaje = '';
	let tipoMensaje: 'success' | 'danger' | 'warning' = 'success';

	onMount(() => {
		cargarDatos();
	});

	async function cargarDatos() {
		cargando = true;
		mensaje = '';

		try {
			const [respuestaEvidencias, respuestaSeguimientos] = await Promise.all([
				fetch(`${API_URL}/evidencias/?id_usuario=${ID_USUARIO}`),
				fetch(`${API_URL}/seguimientos/?id_usuario=${ID_USUARIO}`)
			]);

			if (!respuestaEvidencias.ok) {
				throw new Error(await obtenerError(respuestaEvidencias));
			}

			if (!respuestaSeguimientos.ok) {
				throw new Error(await obtenerError(respuestaSeguimientos));
			}

			evidencias = await respuestaEvidencias.json();
			seguimientos = await respuestaSeguimientos.json();
		} catch (error) {
			mensaje =
				error instanceof Error
					? error.message
					: 'No fue posible conectar con la API.';

			tipoMensaje = 'danger';
		} finally {
			cargando = false;
		}
	}

	async function obtenerError(respuesta: Response): Promise<string> {
		try {
			const datos = await respuesta.json();
			return datos.detail ?? datos.mensaje ?? `Error HTTP ${respuesta.status}`;
		} catch {
			return `Error HTTP ${respuesta.status}`;
		}
	}

	function limpiarFormulario() {
		idSeguimiento = '';
		nombre = '';
		descripcion = '';
		fecha = '';
		evidenciaEditando = null;
	}

	function editarEvidencia(evidencia: Evidencia) {
		evidenciaEditando = evidencia.id_evidencia;
		idSeguimiento = String(evidencia.id_seguimiento);
		nombre = evidencia.nombre;
		descripcion = evidencia.descripcion ?? '';
		fecha = evidencia.fecha?.slice(0, 10) ?? '';

		mensaje = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function guardarEvidencia(evento: SubmitEvent) {
		evento.preventDefault();

		if (!idSeguimiento || !nombre.trim() || !fecha) {
			mensaje = 'Completa el seguimiento, el nombre y la fecha.';
			tipoMensaje = 'warning';
			return;
		}

		guardando = true;
		mensaje = '';

		const datos = {
			id_seguimiento: Number(idSeguimiento),
			nombre: nombre.trim(),
			descripcion: descripcion.trim() || null,
			fecha
		};

		try {
			const url = evidenciaEditando
				? `${API_URL}/evidencias/${evidenciaEditando}?id_usuario=${ID_USUARIO}`
				: `${API_URL}/evidencias/?id_usuario=${ID_USUARIO}`;

			const respuesta = await fetch(url, {
				method: evidenciaEditando ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(datos)
			});

			if (!respuesta.ok) {
				throw new Error(await obtenerError(respuesta));
			}

			mensaje = evidenciaEditando
				? 'Evidencia actualizada correctamente.'
				: 'Evidencia registrada correctamente.';

			tipoMensaje = 'success';

			limpiarFormulario();
			await cargarDatos();
		} catch (error) {
			mensaje =
				error instanceof Error
					? error.message
					: 'No fue posible guardar la evidencia.';

			tipoMensaje = 'danger';
		} finally {
			guardando = false;
		}
	}

	async function inactivarEvidencia(evidencia: Evidencia) {
		const confirmar = window.confirm(
			`¿Deseas inactivar la evidencia "${evidencia.nombre}"?`
		);

		if (!confirmar) return;

		mensaje = '';

		try {
			const respuesta = await fetch(
				`${API_URL}/evidencias/${evidencia.id_evidencia}?id_usuario=${ID_USUARIO}`,
				{ method: 'DELETE' }
			);

			if (!respuesta.ok) {
				throw new Error(await obtenerError(respuesta));
			}

			mensaje = 'Evidencia inactivada correctamente.';
			tipoMensaje = 'success';

			if (evidenciaEditando === evidencia.id_evidencia) {
				limpiarFormulario();
			}

			await cargarDatos();
		} catch (error) {
			mensaje =
				error instanceof Error
					? error.message
					: 'No fue posible inactivar la evidencia.';

			tipoMensaje = 'danger';
		}
	}
</script>

<svelte:head>
	<title>Evidencias | Alerta Temprana</title>
	<meta
		name="description"
		content="Registro y consulta de evidencias de seguimiento académico."
	/>
</svelte:head>

<div class="container-fluid px-4 py-4 page-container">
	<div class="page-heading mb-4">
		<div>
			<span class="section-label">ACOMPAÑAMIENTO ESTUDIANTIL</span>
			<h1 class="fw-bold mt-2 mb-2">Gestión de evidencias</h1>
			<p class="text-secondary mb-0">
				Registra y consulta las evidencias asociadas a los seguimientos.
			</p>
		</div>

		<div class="heading-icon">📁</div>
	</div>

	{#if mensaje}
		<div class="alert alert-{tipoMensaje} alert-dismissible fade show" role="alert">
			{mensaje}
			<button
				type="button"
				class="btn-close"
				aria-label="Cerrar mensaje"
				onclick={() => (mensaje = '')}
			></button>
		</div>
	{/if}

	<div class="row g-4">
		<div class="col-12 col-xl-4">
			<div class="card border-0 shadow-sm form-card">
				<div class="card-header bg-white border-0 p-4">
					<h5 class="fw-bold mb-1">
						{evidenciaEditando ? '✏️ Editar evidencia' : '➕ Registrar evidencia'}
					</h5>
					<p class="text-secondary small mb-0">
						Completa la información del registro.
					</p>
				</div>

				<div class="card-body px-4 pb-4">
					<form onsubmit={guardarEvidencia}>
						<div class="mb-3">
							<label for="seguimiento" class="form-label fw-semibold">
								Seguimiento asociado *
							</label>

							<select
								id="seguimiento"
								class="form-select"
								bind:value={idSeguimiento}
								required
							>
								<option value="">Selecciona un seguimiento</option>

								{#each seguimientos as seguimiento}
									<option value={String(seguimiento.id_seguimiento)}>
										Seguimiento #{seguimiento.id_seguimiento}
										{#if seguimiento.id_caso}
											— Caso #{seguimiento.id_caso}
										{/if}
									</option>
								{/each}
							</select>

							{#if seguimientos.length === 0 && !cargando}
								<div class="form-text text-warning">
									No hay seguimientos disponibles para asociar.
								</div>
							{/if}
						</div>

						<div class="mb-3">
							<label for="nombre" class="form-label fw-semibold">
								Nombre de la evidencia *
							</label>

							<input
								id="nombre"
								class="form-control"
								type="text"
								bind:value={nombre}
								maxlength="150"
								placeholder="Ej. Acta de compromiso"
								required
							/>
						</div>

						<div class="mb-3">
							<label for="descripcion" class="form-label fw-semibold">
								Descripción
							</label>

							<textarea
								id="descripcion"
								class="form-control"
								bind:value={descripcion}
								rows="4"
								placeholder="Describe la evidencia registrada..."
							></textarea>
						</div>

						<div class="mb-4">
							<label for="fecha" class="form-label fw-semibold">
								Fecha de registro *
							</label>

							<input
								id="fecha"
								class="form-control"
								type="date"
								bind:value={fecha}
								required
							/>
						</div>

						<div class="d-grid gap-2">
							<button
								class="btn btn-primary btn-save"
								type="submit"
								disabled={guardando || cargando || seguimientos.length === 0}
							>
								{#if guardando}
									Guardando...
								{:else if evidenciaEditando}
									Guardar cambios
								{:else}
									Registrar evidencia
								{/if}
							</button>

							{#if evidenciaEditando}
								<button
									class="btn btn-outline-secondary"
									type="button"
									onclick={limpiarFormulario}
								>
									Cancelar edición
								</button>
							{/if}
						</div>
					</form>
				</div>
			</div>
		</div>

		<div class="col-12 col-xl-8">
			<div class="card border-0 shadow-sm">
				<div
					class="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-center flex-wrap gap-2"
				>
					<div>
						<h5 class="fw-bold mb-1">Evidencias registradas</h5>
						<p class="text-secondary small mb-0">
							Registros disponibles según los permisos del usuario.
						</p>
					</div>

					<div class="count-badge">
						{evidencias.length} registros
					</div>
				</div>

				<div class="card-body p-0">
					{#if cargando}
						<div class="text-center py-5">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Cargando...</span>
							</div>
							<p class="text-secondary mt-3 mb-0">Consultando evidencias...</p>
						</div>
					{:else if evidencias.length === 0}
						<div class="empty-state text-center py-5 px-3">
							<div class="empty-icon">📂</div>
							<h6 class="fw-bold mt-3">No hay evidencias para mostrar</h6>
							<p class="text-secondary mb-0">
								Cuando existan evidencias asociadas a seguimientos activos,
								aparecerán aquí.
							</p>
						</div>
					{:else}
						<div class="table-responsive">
							<table class="table align-middle mb-0">
								<thead>
									<tr>
										<th class="ps-4">Evidencia</th>
										<th>Seguimiento</th>
										<th>Fecha</th>
										<th class="text-end pe-4">Acciones</th>
									</tr>
								</thead>

								<tbody>
									{#each evidencias as evidencia (evidencia.id_evidencia)}
										<tr>
											<td class="ps-4">
												<div class="fw-semibold">
													{evidencia.nombre}
												</div>
												<div class="text-secondary small description-cell">
													{evidencia.descripcion || 'Sin descripción'}
												</div>
												<div class="text-secondary small">
													ID: {evidencia.id_evidencia}
												</div>
											</td>

											<td>
												<span class="followup-badge">
													#{evidencia.id_seguimiento}
												</span>
											</td>

											<td>{evidencia.fecha?.slice(0, 10) || '—'}</td>

											<td class="text-end pe-4">
												<div class="d-flex justify-content-end gap-2">
													<button
														class="btn btn-sm btn-outline-primary"
														type="button"
														onclick={() => editarEvidencia(evidencia)}
														title="Editar evidencia"
													>
														Editar
													</button>

													<button
														class="btn btn-sm btn-outline-danger"
														type="button"
														onclick={() => inactivarEvidencia(evidencia)}
														title="Inactivar evidencia"
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

				<div class="card-footer bg-white border-0 px-4 py-3">
					<button
						class="btn btn-sm btn-outline-secondary"
						type="button"
						onclick={cargarDatos}
						disabled={cargando}
					>
						↻ Actualizar lista
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.page-container {
		min-height: 75vh;
		background: #f5f8fc;
	}

	.page-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	.section-label {
		color: #168aad;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 1.5px;
	}

	.page-heading h1 {
		color: #19324d;
		font-size: clamp(1.7rem, 3vw, 2.2rem);
	}

	.heading-icon {
		display: flex;
		width: 68px;
		height: 68px;
		align-items: center;
		justify-content: center;
		border-radius: 20px;
		background: linear-gradient(135deg, #d9f3ff, #d9f8e8);
		font-size: 2rem;
		flex-shrink: 0;
	}

	.form-card,
	.card {
		border-radius: 16px;
		overflow: hidden;
	}

	.form-label {
		color: #344054;
		font-size: 0.9rem;
	}

	.form-control,
	.form-select {
		border-radius: 9px;
		padding: 10px 12px;
		border-color: #dce5ef;
	}

	.form-control:focus,
	.form-select:focus {
		border-color: #168aad;
		box-shadow: 0 0 0 0.2rem rgba(22, 138, 173, 0.12);
	}

	.btn-save {
		padding: 11px;
		border: none;
		border-radius: 9px;
		background: linear-gradient(100deg, #1769aa, #168aad);
		font-weight: 600;
	}

	.count-badge,
	.followup-badge {
		display: inline-block;
		padding: 6px 10px;
		border-radius: 8px;
		background: #e1f5fe;
		color: #1769aa;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.table thead th {
		padding-top: 14px;
		padding-bottom: 14px;
		background: #f7f9fc;
		color: #667085;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		white-space: nowrap;
	}

	.table tbody td {
		padding-top: 15px;
		padding-bottom: 15px;
		border-color: #edf1f6;
	}

	.description-cell {
		max-width: 260px;
		overflow-wrap: anywhere;
	}

	.empty-icon {
		font-size: 2.8rem;
	}

	@media (max-width: 576px) {
		.page-heading {
			align-items: flex-start;
		}

		.heading-icon {
			width: 52px;
			height: 52px;
			font-size: 1.5rem;
		}
	}
</style>
