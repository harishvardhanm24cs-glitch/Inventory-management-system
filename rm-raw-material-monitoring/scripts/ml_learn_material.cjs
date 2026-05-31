const fs = require('fs');
const PNG = require('pngjs').PNG;

function extractFeatures(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    const png = PNG.sync.read(buffer);

    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = png.width * png.height;

    for (let i = 0; i < png.data.length; i += 4) {
        totalR += png.data[i];
        totalG += png.data[i + 1];
        totalB += png.data[i + 2];
    }

    return {
        avgR: totalR / pixelCount,
        avgG: totalG / pixelCount,
        avgB: totalB / pixelCount,
        dimensions: { width: png.width, height: png.height }
    };
}

const args = process.argv.slice(2);
const command = args[0]; // --learn or --predict
const filePath = args[1] || 'blue paint.png';
const modelPath = 'material_features_model.json';

if (command === '--learn') {
    console.log(`Learning characteristics of ${filePath}...`);
    const features = extractFeatures(filePath);
    let model = {};
    if (fs.existsSync(modelPath)) {
        model = JSON.parse(fs.readFileSync(modelPath));
    }
    model['Blue Paint'] = features;
    fs.writeFileSync(modelPath, JSON.stringify(model, null, 2));
    console.log(`Knowledge saved to ${modelPath}`);
} else if (command === '--predict') {
    if (!fs.existsSync(modelPath)) {
        console.error('Model not trained yet. Run with --learn first.');
        process.exit(1);
    }
    const features = extractFeatures(filePath);
    const model = JSON.parse(fs.readFileSync(modelPath));

    let bestMatch = 'Unknown';
    let minDiff = Infinity;

    for (const [name, targetFeatures] of Object.entries(model)) {
        const diff = Math.sqrt(
            Math.pow(features.avgR - targetFeatures.avgR, 2) +
            Math.pow(features.avgG - targetFeatures.avgG, 2) +
            Math.pow(features.avgB - targetFeatures.avgB, 2)
        );
        if (diff < minDiff) {
            minDiff = diff;
            bestMatch = name;
        }
    }

    // Simple threshold for "recognition"
    if (minDiff < 10) {
        console.log(`Material recognized as: ${bestMatch} (Confidence Score: ${(1 - minDiff / 255).toFixed(4)})`);
    } else {
        console.log('Material not recognized. Prediction: Unknown');
    }
} else {
    console.log('Usage: node ml_learn_material.cjs [--learn | --predict] [image_path]');
}
