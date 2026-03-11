try {
    const lcss = require('lightningcss');
    console.log('✅ lightningcss ok');
} catch (e) {
    console.error('❌ lightningcss fail:', e.message);
}
try {
    const oxide = require('@tailwindcss/oxide');
    console.log('✅ tailwind oxide ok');
} catch (e) {
    console.error('❌ tailwind oxide fail:', e.message);
}
console.log('RQ:', require.resolve('@tanstack/react-query'));
