
<svelte:head>
	<title>Tablero | Alerta Temprana</title>
	<meta
		name="description"
		content="Tablero general de seguimiento y prevención de deserción escolar."
	/>
</svelte:head>

<script lang="ts">
	const dashboardUrl = '/dashboard?embed=1';
</script>

<div class="tablero-container">
	<div class="tablero-header">
		<div>
			<h2>Tablero de seguimiento</h2>
			<p>
				Visualización integrada de indicadores académicos y riesgos de deserción.
			</p>
		</div>

		<a href="/dashboard" class="btn-dashboard">
			<icon-placeholder></icon-placeholder>
			Abrir Dashboard completo
		</a>
	</div>

	<section class="tablero-panel">
		<iframe
			src={dashboardUrl}
			title="Dashboard integrado de Alerta Temprana"
			loading="eager"
			allowfullscreen
		></iframe>
	</section>
</div>

<style>
	.tablero-container {
		width: 100%;
		min-height: 80vh;
		padding: 24px;
		background: #f1f5f9;
	}

	.tablero-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 15px;
		margin-bottom: 20px;
	}

	.tablero-header h2 {
		margin: 0 0 5px;
		color: #17324d;
		font-size: 1.7rem;
		font-weight: 800;
	}

	.tablero-header p {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
	}

	.btn-dashboard {
		display: inline-block;
		padding: 10px 16px;
		border: 1px solid #1769aa;
		border-radius: 8px;
		background: white;
		color: #1769aa;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		transition: 0.2s ease;
	}

	.btn-dashboard:hover {
		background: #1769aa;
		color: white;
	}

	.tablero-panel {
		width: 100%;
		height: calc(100vh - 190px);
		min-height: 750px;
		overflow: hidden;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: white;
		box-shadow: 0 5px 20px rgba(23, 50, 77, 0.08);
	}

	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: none;
		background: white;
	}

	@media (max-width: 768px) {
		.tablero-container {
			padding: 14px;
		}

		.tablero-panel {
			height: 850px;
			min-height: 700px;
		}

		.tablero-header h2 {
			font-size: 1.4rem;
		}
	}
</style>
