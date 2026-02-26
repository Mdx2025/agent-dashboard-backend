import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/mdx_control';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.DATABASE_URL?.includes('railway') ? {
    ssl: { require: true, rejectUnauthorized: false }
  } : {},
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;
