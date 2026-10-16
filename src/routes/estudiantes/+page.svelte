<svelte:head>
	<title>Estudiantes</title>
</svelte:head>

<div class="container mt-4">

	<div class="d-flex justify-content-between align-items-center mb-4">
		<div>
			<h2>Gestión de Estudiantes</h2>
			<p class="text-muted">
				Registro y seguimiento de estudiantes.
			</p>
		</div>

		<button class="btn btn-primary">
			+ Nuevo estudiante
		</button>
	</div>

	<div class="card shadow-sm">

		<div class="card-header">
			<strong>Listado de estudiantes</strong>
		</div>

		<div class="card-body">

			<div class="table-responsive">

				<table class="table table-hover align-middle">

					<thead class="table-dark">
						<tr>
							<th>ID</th>
							<th>Nombre</th>
							<th>Apellido</th>
							<th>Documento</th>
							<th>Curso</th>
							<th>Estado</th>
							<th>Acciones</th>
						</tr>
					</thead>

					<tbody>

						<tr>
							<td>1</td>
							<td>María</td>
							<td>Gómez</td>
							<td>100100100</td>
							<td>10°A</td>
							<td>
								<span class="badge text-bg-success">
									Activo
								</span>
							</td>
							<td>
								<button class="btn btn-sm btn-outline-primary">
									Ver
								</button>

								<button class="btn btn-sm btn-outline-secondary">
									Editar
								</button>
							</td>
						</tr>

						<tr>
							<td>2</td>
							<td>Juan</td>
							<td>Pérez</td>
							<td>100200200</td>
							<td>10°A</td>
							<td>
								<span class="badge text-bg-success">
									Activo
								</span>
							</td>
							<td>
								<button class="btn btn-sm btn-outline-primary">
									Ver
								</button>

								<button class="btn btn-sm btn-outline-secondary">
									Editar
								</button>
							</td>
						</tr>

						<tr>
							<td>3</td>
							<td>Carlos</td>
							<td>Rodríguez</td>
							<td>100300300</td>
							<td>9°B</td>
							<td>
								<span class="badge text-bg-warning">
									En seguimiento
								</span>
							</td>
							<td>
								<button class="btn btn-sm btn-outline-primary">
									Ver
								</button>

								<button class="btn btn-sm btn-outline-secondary">
									Editar
								</button>
							</td>
						</tr>

					</tbody>

				</table>

			</div>

		</div>
	</div>

</div>