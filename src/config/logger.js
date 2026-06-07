// ═══════════════════════════════════════════════════════
//  BADEL — Winston Logger Configuration (src/config/logger.js)
// ═══════════════════════════════════════════════════════

const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    ),
    transports: [
        // أخطاء فقط في error.log
        new winston.transports.File({ 
            filename: path.join('logs', 'error.log'), 
            level: 'error' 
        }),
        // كل شيء في combined.log
        new winston.transports.File({ 
            filename: path.join('logs', 'combined.log') 
        })
    ]
});

// إذا كنا في التطوير، اعرض في الكونسول بألوان
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
