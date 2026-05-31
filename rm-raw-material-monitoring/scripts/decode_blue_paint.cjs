const fs = require('fs');
const PNG = require('pngjs').PNG;
const jsQR = require('jsqr');

const imagePath = 'blue paint.png';

if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
}

const buffer = fs.readFileSync(imagePath);
const png = PNG.sync.read(buffer);

const code = jsQR(png.data, png.width, png.height);

if (code) {
    console.log('Decoded QR Code data:');
    console.log(code.data);

    // Save to a temporary file for the next step
    fs.writeFileSync('decoded_data.txt', code.data);
} else {
    console.error('Failed to decode QR code. Make sure the image is a valid QR code.');
    process.exit(1);
}
