import { initDB } from './db';

const bootstrap = async () => {
    console.log('🚀 Starting Industrial DB Bootstrap...');
    try {
        await initDB();
        console.log('✅ DB Bootstrap Complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ DB Bootstrap Failed:', err);
        process.exit(1);
    }
};

bootstrap();
