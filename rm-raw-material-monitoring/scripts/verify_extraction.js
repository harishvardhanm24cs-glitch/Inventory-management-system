const tests = [
    { input: 'RM-12345678', expected: 'RM-12345678' },
    { input: 'https://www.canvaqr.com/RGBahkSER5', expected: 'RGBahkSER5' },
    { input: 'https://example.com/item/12345/', expected: '12345' },
    { input: 'http://localhost:3000/scan?id=abc', expected: 'scan' }, // Simple extraction logic might fail on query params, let's see
    { input: '  RM-SPACE  ', expected: 'RM-SPACE' },
    { input: 'https://mysite.io/test', expected: 'test' }
];

const extractId = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http')) {
        try {
            // This is the logic used in the React components
            const url = new URL(trimmed);
            const pathname = url.pathname.replace(/\/+$/, '');
            const segment = pathname.split('/').pop();
            return segment || trimmed;
        } catch (e) {
            return trimmed.replace(/\/+$/, '').split('/').pop() || trimmed;
        }
    }
    return trimmed;
};

let passed = 0;
tests.forEach(test => {
    const output = extractId(test.input);
    if (output === test.expected) {
        console.log(`✅ PASS: "${test.input}" -> "${output}"`);
        passed++;
    } else {
        console.log(`❌ FAIL: "${test.input}" -> Expected "${test.expected}", got "${output}"`);
    }
});

console.log(`\nResult: ${passed}/${tests.length} tests passed.`);
if (passed === tests.length) {
    process.exit(0);
} else {
    process.exit(1);
}
