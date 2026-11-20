
<script lang="ts">
	import { goto } from '$app/navigation';

	const API_URL = 'http://127.0.0.1:8001';

	let correo = $state('');
	let contrasena = $state('');
	let error = $state('');
	let cargando = $state(false);

	async function iniciarSesion() {
		error = '';

		if (!correo.trim() || !contrasena) {
			error = 'Ingresa tu correo y contraseña para continuar.';
			return;
		}

		cargando = true;

		try {
			const respuesta = await fetch(`${API_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					correo: correo.trim(),
					contrasena
				})
			});

			const resultado = await respuesta.json();

			if (!respuesta.ok) {
				if (respuesta.status === 401) {
					error = 'Correo o contraseña incorrectos.';
				} else if (respuesta.status === 422) {
					error = 'Verifica que el correo tenga un formato válido.';
				} else {
					error = resultado.detail || 'No fue posible iniciar sesión.';
				}
				return;
			}

			if (
				!resultado.access_token ||
				!resultado.usuario ||
				!resultado.usuario.id_rol
			) {
				error = 'La API no devolvió todos los datos necesarios.';
				return;
			}

			localStorage.setItem('tokenAcceso', resultado.access_token);

			localStorage.setItem(
				'usuarioSesion',
				JSON.stringify({
					id_usuario: resultado.usuario.id_usuario,
					nombre: resultado.usuario.nombre,
					apellido: resultado.usuario.apellido,
					correo: resultado.usuario.correo,
					id_rol: resultado.usuario.id_rol,
					rol: resultado.usuario.nombre_rol
				})
			);

			await goto('/dashboard');
		} catch (e) {
			console.error('Error de inicio de sesión:', e);
			error =
				'No se pudo conectar con el servidor. Comprueba que la API esté funcionando en el puerto 8001.';
		} finally {
			cargando = false;
		}
	}
</script>

<svelte:head>
	<title>Iniciar sesión | Alerta Temprana</title>
	<meta
		name="description"
		content="Inicio de sesión del Sistema de Alerta Temprana de Deserción Escolar."
	/>
</svelte:head>

<div class="login-page">
	<div class="login-container">
		<section class="login-brand">
			<div class="brand-icon">🎓</div>

			<p class="brand-label">SISTEMA ACADÉMICO</p>

			<h1>Alerta Temprana</h1>

			<p class="brand-description">
				Plataforma de seguimiento académico y prevención de la deserción escolar.
			</p>

			<div class="brand-divider"></div>

			<div class="feature">
				<span>📊</span>
				<div>
					<strong>Seguimiento académico</strong>
					<p>Consulta el progreso de los estudiantes.</p>
				</div>
			</div>

			<div class="feature">
				<span>🚦</span>
				<div>
					<strong>Alertas tempranas</strong>
					<p>Identifica situaciones que requieren atención.</p>
				</div>
			</div>

			<div class="feature">
				<span>🤝</span>
				<div>
					<strong>Acompañamiento</strong>
					<p>Facilita el seguimiento de casos académicos.</p>
				</div>
			</div>
		</section>

		<section class="login-form-section">
			<div class="login-form">
				<div class="welcome-icon">👋</div>

				<h2>¡Bienvenido!</h2>

				<p class="subtitle">Ingresa tus datos para continuar.</p>

				<form
					onsubmit={(event) => {
						event.preventDefault();
						iniciarSesion();
					}}
				>
					<div class="mb-3">
						<label for="correo" class="form-label">
							Correo electrónico
						</label>

						<input
							id="correo"
							type="email"
							class="form-control"
							placeholder="usuario@institucion.edu"
							bind:value={correo}
							autocomplete="username"
							required
							disabled={cargando}
						/>
					</div>

					<div class="mb-4">
						<label for="contrasena" class="form-label">
							Contraseña
						</label>

						<input
							id="contrasena"
							type="password"
							class="form-control"
							placeholder="Ingresa tu contraseña"
							bind:value={contrasena}
							autocomplete="current-password"
							required
							disabled={cargando}
						/>
					</div>

					{#if error}
						<div class="alert alert-danger py-2" role="alert">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						class="btn btn-login w-100"
						disabled={cargando}
					>
						{cargando ? 'Verificando...' : 'Iniciar sesión'}
						{#if !cargando}
							<span aria-hidden="true">→</span>
						{/if}
					</button>
				</form>

				<div class="demo-notice">
					<span>🔐</span>
					<p>
						<strong>Acceso seguro.</strong>
						Ingresa con tu cuenta registrada. Los permisos dependen del rol
						asignado en el sistema.
					</p>
				</div>
			</div>

			<p class="footer-note">
				Alerta Temprana de Deserción Escolar
				<br />
				Sistema de seguimiento académico
			</p>
		</section>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f1f5f9;
		font-family: Arial, Helvetica, sans-serif;
	}

	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 35px 20px;
		background:
			radial-gradient(circle at top left, #d9f2ed 0, transparent 38%),
			linear-gradient(135deg, #f1f5f9, #e8eff8);
	}

	.login-container {
		width: 100%;
		max-width: 1050px;
		min-height: 610px;
		display: grid;
		grid-template-columns: 0.95fr 1.05fr;
		overflow: hidden;
		background: #ffffff;
		border-radius: 24px;
		box-shadow: 0 24px 70px rgba(24, 52, 83, 0.14);
	}

	.login-brand {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 55px 45px;
		color: #ffffff;
		background: linear-gradient(145deg, #1769aa, #168aad, #168b80);
	}

	.brand-icon {
		width: 65px;
		height: 65px;
		display: grid;
		place-items: center;
		margin-bottom: 30px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.15);
		font-size: 32px;
	}

	.brand-label {
		margin-bottom: 10px;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 2px;
		opacity: 0.85;
	}

	.login-brand h1 {
		margin-bottom: 18px;
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 800;
		line-height: 1.15;
	}

	.brand-description {
		max-width: 360px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		line-height: 1.8;
	}

	.brand-divider {
		height: 1px;
		margin: 25px 0;
		background: rgba(255, 255, 255, 0.25);
	}

	.feature {
		display: flex;
		align-items: flex-start;
		gap: 13px;
		margin: 12px 0;
	}

	.feature > span {
		font-size: 1.35rem;
	}

	.feature strong {
		font-size: 0.94rem;
	}

	.feature p {
		margin: 4px 0 0;
		color: rgba(255, 255, 255, 0.82);
		font-size: 0.83rem;
		line-height: 1.5;
	}

	.login-form-section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 45px 55px 25px;
	}

	.login-form {
		width: 100%;
		max-width: 390px;
		margin: 0 auto;
	}

	.welcome-icon {
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		margin-bottom: 18px;
		border-radius: 14px;
		background: #e7f5f3;
		font-size: 24px;
	}

	.login-form h2 {
		margin-bottom: 8px;
		color: #17324d;
		font-size: 1.9rem;
		font-weight: 800;
	}

	.subtitle {
		margin-bottom: 28px;
		color: #718096;
		font-size: 0.94rem;
	}

	.form-label {
		color: #344054;
		font-size: 0.88rem;
		font-weight: 700;
	}

	.form-control {
		min-height: 47px;
		border: 1px solid #dbe3ec;
		border-radius: 10px;
		font-size: 0.9rem;
	}

	.form-control:focus {
		border-color: #168aad;
		box-shadow: 0 0 0 0.2rem rgba(22, 138, 173, 0.12);
	}

	.btn-login {
		min-height: 49px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: none;
		border-radius: 10px;
		background: linear-gradient(100deg, #1769aa, #168aad);
		color: #ffffff;
		font-weight: 700;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.btn-login:hover:not(:disabled) {
		transform: translateY(-1px);
		background: linear-gradient(100deg, #12588f, #11768f);
		color: #ffffff;
		box-shadow: 0 8px 18px rgba(23, 105, 170, 0.2);
	}

	.btn-login:disabled {
		cursor: wait;
		opacity: 0.7;
	}

	.demo-notice {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-top: 22px;
		padding: 13px;
		border: 1px solid #dceaf6;
		border-radius: 10px;
		background: #f3f8fc;
	}

	.demo-notice p {
		margin: 0;
		color: #526579;
		font-size: 0.78rem;
		line-height: 1.6;
	}

	.footer-note {
		margin: 28px 0 0;
		color: #98a2b3;
		font-size: 0.76rem;
		line-height: 1.8;
		text-align: center;
	}

	@media (max-width: 800px) {
		.login-container {
			max-width: 520px;
			grid-template-columns: 1fr;
		}

		.login-brand {
			padding: 35px;
		}

		.brand-icon {
			width: 52px;
			height: 52px;
			margin-bottom: 18px;
			font-size: 26px;
		}

		.brand-divider,
		.feature {
			display: none;
		}

		.login-brand h1 {
			font-size: 2rem;
		}

		.brand-description {
			margin-bottom: 0;
		}

		.login-form-section {
			padding: 35px 28px 25px;
		}
	}

	@media (max-width: 420px) {
		.login-page {
			padding: 15px 10px;
		}

		.login-brand {
			padding: 28px 24px;
		}

		.login-form-section {
			padding: 30px 22px 20px;
		}
	}
</style>

