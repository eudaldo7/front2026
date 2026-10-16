<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import 'bootstrap/dist/css/bootstrap.min.css';
	import Navbar from '$lib/components/Navbar.svelte';
    import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';


	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<Header />
<Navbar />

{@render children()}
<Footer />