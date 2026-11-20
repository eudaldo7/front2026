import adapter from '@sveltejs/adapter-vercel';

export default {
    compilerOptions: {
        runes: true
    },
    kit: {
        adapter: adapter()
    }
};
