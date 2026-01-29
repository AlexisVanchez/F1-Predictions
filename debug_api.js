
const fetch = require('node-fetch'); // Assuming node-fetch is available or using native fetch in newer node

// Polyfill fetch if needed (for older node environs in this context)
// But likely I can just use native fetch if node 18+
// Or just use a simple https request if no fetch.
// Let's assume standard fetch is available or try to require it.

async function check() {
    try {
        const res = await fetch('https://api.openf1.org/v1/sessions?session_name=Race&year=2024');
        const races = await res.json();

        // Sort descending
        races.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

        console.log(`Found ${races.length} races in 2024.`);

        // Check top 5
        const top5 = races.slice(0, 5);

        for (const race of top5) {
            console.log(`Checking ${race.session_name} (${race.date_start}, key: ${race.session_key})...`);

            const resResult = await fetch(`https://api.openf1.org/v1/session_result?session_key=${race.session_key}`);
            const data = await resResult.json();

            console.log(`  - Results found: ${data && data.length > 0 ? data.length + ' entries' : 'NONE'}`);
        }

    } catch (e) {
        console.error(e);
    }
}

check();
