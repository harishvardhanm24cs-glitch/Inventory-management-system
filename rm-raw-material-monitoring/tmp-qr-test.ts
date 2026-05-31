import { parseQRData } from './src/lib/qrEngine';

const tests = [
    '{"materialId":"RM001","quantity":50}',
    "{'materialId':'RM002','quantity':15}",
    "{materialId: 'RM003', quantity: 20}",
    "JUST_A_STRING",
    '{"barcodeId": "RM004", "weight": 99}'
];

tests.forEach(t => {
    console.log(`Input: ${t}`);
    console.log(`Parsed:`, parseQRData(t));
    console.log('---');
});
