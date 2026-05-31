/**
 * Automated Validation Suite for Smart Inventory Vision System
 * Tests the QR Extraction Logic per Phase 7 Constraints
 */
import { parseQRData } from '../src/lib/qrEngine.js';

let passed = 0;
let failed = 0;

const assert = (name: string, input: string, expectedAmount: number) => {
    try {
        const result = parseQRData(input);
        if (result.quantity === expectedAmount) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name}`);
            console.error(`   - Expected: ${expectedAmount}`);
            console.error(`   - Received JSON payload:`, result);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ [FATAL ERROR] ${name}: ${err.message}`);
        failed++;
    }
};

console.log('====================================');
console.log('🧪 Running QR Parsing Matrix Tests');
console.log('====================================\n');


// Case 1: Standard JSON containing exact payload
assert('Valid JSON format parses securely', 
       `{"materialId":"RM001","quantity":50}`, 
       50);

// Case 2: Hand-made QR JSON with unquoted keys/single quotes
assert('Malformed JSON edge-cases recover smoothly', 
       `{materialId: 'RM002', quantity: 72}`, 
       72);

// Case 3: Simple QR string correctly forces the fallback parameter
assert('Simple text QR triggers native fallback configuration', 
       `RM123-SIMPLE`, 
       1);

// Case 4: Standard JSON but completely missing a quantitative index
assert('Standard JSON missing quantity triggers native fallback', 
       `{"materialId":"RM004", "batch": "X1"}`, 
       1);

console.log('\n====================================');
console.log(`Test Summary: ${passed} Passed | ${failed} Failed`);
console.log('====================================');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
