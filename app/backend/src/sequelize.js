import { Sequelize } from 'sequelize';
import { config } from './config/config.js';

// Determine dialect: prefer explicit DB_DIALECT, then flags, default to sqlite for local testing
const envDialect = process.env.DB_DIALECT || (process.env.USE_SQLITE === 'true' ? 'sqlite' : (process.env.USE_MYSQL === 'true' ? 'mysql' : 'sqlite'));

let sequelize;
if (envDialect === 'sqlite') {
  const storage = process.env.SQLITE_FILE || './database.sqlite';
  sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
} else {
  sequelize = new Sequelize(process.env.DB_NAME || 'booksy', process.env.DB_USER || 'root', process.env.DB_PASS || '', {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: envDialect,
    logging: false,
  });
}

export default sequelize;
