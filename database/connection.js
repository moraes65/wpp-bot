import dotenv from 'dotenv';
dotenv.config();
import { Sequelize } from 'sequelize';

const config = {
	dialect: 'mssql',
	host: process.env.MSSQL_HOST,
	username: process.env.MSSQL_USER,
	password: process.env.MSSQL_PASS,
	database: process.env.MSSQL_NAME,
	port: 1433,
	define: {
		charset: 'utf8mb4',
		collate: 'utf8mb4_unicode_ci',
		timestamps: true,
		underscored: true,
		underscoredAll: true,
	},
	logging: false,
	dialectOptions: {
		// Observe the need for this nested `options` field for MSSQL
		options: {
			encrypt: false,
			requestTimeout: 300000,
			useUTC: false,
			dateFirst: 1,
		},
	},
	pool: {
		max: 20,
		min: 0,
		acquire: 30000,
		idle: 10000,
		idleTimeoutMillis: 300000,
	},
};


const connection = new Sequelize(
	config.database,
	config.username,
	config.password,
	config
);

await connection.authenticate();
console.log(`MSSQL conn has been established: ${config.host}.`);

export default { connection };
