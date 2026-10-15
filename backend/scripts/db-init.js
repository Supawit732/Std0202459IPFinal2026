// Runs sql/schema.sql through mysql2 (no mysql CLI needed).
//   npm run db:init   -> create table if missing, run seed INSERTs only if the table is empty (safe to re-run)
//   npm run db:reset  -> DROP the LeeSup_employees table first, then init (destroys data!)
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function main() {
  const reset = process.argv.includes('--reset');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  // Strip "--" comment lines, then split on statement-ending semicolons.
  const statements = schema
    .replace(/^\s*--.*$/gm, '')
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (reset) {
    await pool.query('DROP TABLE IF EXISTS LeeSup_employees');
    console.log('Dropped LeeSup_employees');
  }
  for (const sql of statements) {
    if (/^INSERT\b/i.test(sql)) {
      // Seed rows only when the table is empty, so re-running never duplicates them.
      const [[{ existing }]] = await pool.query('SELECT COUNT(*) AS existing FROM LeeSup_employees');
      if (existing > 0) {
        console.log('Table already has data; skipping seed INSERT.');
        continue;
      }
    }
    await pool.query(sql);
  }
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM LeeSup_employees');
  console.log(`Database ready. LeeSup_employees has ${total} row(s).`);
}

main()
  .catch((err) => {
    console.error('db:init failed:', err.code || '', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
