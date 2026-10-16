
<nav class="navbar navbar-expand-lg navbar-custom shadow-sm">
	<div class="container-fluid px-4">
		<a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="/">
			<span class="brand-icon">🎓</span>
			<span>Alerta Temprana</span>
		</a>

		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#menuPrincipal"
			aria-controls="menuPrincipal"
			aria-expanded="false"
			aria-label="Mostrar menú"
		>
			<span class="navbar-toggler-icon"></span>
		</button>

		<div class="collapse navbar-collapse" id="menuPrincipal">
			<div class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
				<a class="nav-link" href="/">Inicio</a>

				<a class="nav-link" href="/dashboard">
					<span class="nav-icon">📊</span> Dashboard
				</a>

				<a class="nav-link" href="/estudiantes">
					<span class="nav-icon">🎓</span> Estudiantes
				</a>

				<details class="menu-group">
					<summary class="nav-link">
						<span class="nav-icon">📝</span> Seguimiento académico
					</summary>

					<div class="dropdown-menu-custom">
						<a href="/asistencias">📅 Asistencias</a>
						<a href="/notas">📚 Calificaciones</a>
						<a href="/convivencias">🤝 Convivencia</a>
					</div>
				</details>

				<details class="menu-group">
					<summary class="nav-link">
						<span class="nav-icon">🚦</span> Alertas y casos
					</summary>

					<div class="dropdown-menu-custom">
						<a href="/riesgos">🚨 Riesgos</a>
						<a href="/casos">📂 Casos</a>
						<a href="/seguimientos">🔎 Seguimientos</a>
						<a href="/evidencias">📁 Evidencias</a>
						<a href="/notificaciones">🔔 Notificaciones</a>
					</div>
				</details>

				<a class="nav-link" href="/reportes">
					<span class="nav-icon">📈</span> Reportes
				</a>

				<details class="menu-group">
					<summary class="nav-link">
						<span class="nav-icon">⚙️</span> Administración
					</summary>

					<div class="dropdown-menu-custom dropdown-right">
						<a href="/usuarios">👥 Usuarios</a>
						<a href="/roles">🛡️ Roles</a>
						<a href="/modulos">🧩 Módulos</a>
						<a href="/administracion">⚙️ Panel administrativo</a>
					</div>
				</details>
			</div>
		</div>
	</div>
</nav>

<style>
	.navbar-custom {
		background: linear-gradient(100deg, #1769aa, #168aad, #20a486);
		min-height: 72px;
	}

	.navbar-brand {
		color: #ffffff;
		font-size: 1.2rem;
		white-space: nowrap;
	}

	.navbar-brand:hover {
		color: #d8fff2;
	}

	.brand-icon {
		background: rgba(255, 255, 255, 0.18);
		border-radius: 12px;
		padding: 7px 9px;
		font-size: 1.2rem;
	}

	.navbar-nav .nav-link {
		color: #ffffff;
		font-weight: 500;
		padding: 10px 12px;
		border-radius: 10px;
		cursor: pointer;
		text-decoration: none;
		white-space: nowrap;
		transition: background-color 0.2s ease;
	}

	.navbar-nav .nav-link:hover {
		background-color: rgba(255, 255, 255, 0.18);
		color: #ffffff;
	}

	.nav-icon {
		margin-right: 3px;
	}

	.menu-group {
		position: relative;
	}

	.menu-group summary {
		list-style: none;
	}

	.menu-group summary::-webkit-details-marker {
		display: none;
	}

	.menu-group summary::after {
		content: ' ▾';
		font-size: 0.75rem;
	}

	.dropdown-menu-custom {
		position: absolute;
		top: calc(100% + 5px);
		left: 0;
		z-index: 1050;
		min-width: 210px;
		padding: 8px;
		background: #ffffff;
		border: 1px solid #e5edf5;
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(28, 55, 90, 0.16);
	}

	.dropdown-menu-custom a {
		display: block;
		padding: 10px 12px;
		border-radius: 8px;
		color: #344054;
		text-decoration: none;
		font-size: 0.94rem;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
	}

	.dropdown-menu-custom a:hover {
		background-color: #e6f7f4;
		color: #087f70;
	}

	.menu-group[open] .nav-link {
		background-color: rgba(255, 255, 255, 0.18);
	}

	@media (min-width: 992px) {
		.dropdown-right {
			left: auto;
			right: 0;
		}
	}

	@media (max-width: 991.98px) {
		.navbar-custom {
			padding: 10px 0;
		}

		.navbar-nav {
			align-items: stretch !important;
			padding-top: 12px;
		}

		.menu-group {
			width: 100%;
		}

		.dropdown-menu-custom {
			position: static;
			margin: 4px 8px 10px;
			box-shadow: none;
			border-color: #dce8ef;
		}
	}
</style>

