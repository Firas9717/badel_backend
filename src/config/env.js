// ═══════════════════════════════════════════════════════
//  BADEL — Env Variables Validation (src/config/env.js)
// ═══════════════════════════════════════════════════════

const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'PORT'
];

const validateEnv = () => {
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
        console.error('❌ FATAL ERROR: Missing environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('⚠️  Server shutting down. Please check your .env file.');
        process.exit(1);
    }

    console.log('✅ Environment variables validated.');
};

module.exports = validateEnv;
