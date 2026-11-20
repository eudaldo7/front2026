
<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import 'bootstrap/dist/css/bootstrap.min.css';

	import { page } from '$app/state';

	import Navbar from '$lib/components/Navbar.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	// Detecta cuando una página se está mostrando dentro de un iframe.
	const modoIncrustado = $derived(
		page.url.searchParams.get('embed') === '1'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Alerta Temprana | Sistema Académico</title>
</svelte:head>

{#if !modoIncrustado}
	<Header />
	<Navbar />
{/if}

<main class:modo-incrustado={modoIncrustado}>
	{@render children()}
</main>

{#if !modoIncrustado}
	<Footer />
{/if}

<style>
	:global(html) {
		width: 100%;
		min-height: 100%;
		overflow-x: hidden;
	}

	:global(body) {
		width: 100%;
		min-height: 100vh;
		margin: 0;
		overflow-x: hidden;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(img),
	:global(table) {
		max-width: 100%;
	}

	main {
		width: 100%;
		max-width: 100%;
		min-height: 70vh;
	}

	main.modo-incrustado {
		min-height: 100vh;
	}
</style>
