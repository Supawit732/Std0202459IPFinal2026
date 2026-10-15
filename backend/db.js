require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000, // fail fast (clean 500) when the DB is unreachable
  decimalNumbers: true, // DECIMAL columns come back as numbers, not strings
  namedPlaceholders: false,
});

module.exports = pool;
