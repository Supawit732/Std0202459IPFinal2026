require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { kmeans1D } = require('./kmeans');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = 'mock-jwt-token';

app.use(cors());
app.use(express.json());

// ---------- SQL helpers ----------
// Columns are prefixed LeeSup_ in the database; alias them back so the API JSON
// stays { id: "1", name, position, status, salary: 45000 }.
const EMPLOYEE_COLS = `
  CAST(LeeSup_id AS CHAR) AS id,
  LeeSup_name AS name,
  LeeSup_position AS position,
  LeeSup_status AS status,
  CAST(LeeSup_salary AS DOUBLE) AS salary`;

const toEmployee = (row) => ({ ...row, salary: Number(row.salary) });

async function findEmployee(id) {
  const [rows] = await pool.query(
    `SELECT ${EMPLOYEE_COLS} FROM LeeSup_employees WHERE LeeSup_id = ?`,
    [id]
  );
  return rows.length ? toEmployee(rows[0]) : null;
}

// Route handlers are async; forward any rejection (e.g. DB down) to the error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ids are INT auto-increment values; anything else can never match a row.
const isValidId = (id) => /^\d{1,10}$/.test(id);

const isBlank = (v) => typeof v !== 'string' || v.trim() === '';

function parseSalary(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (isBlank(username) || typeof password !== 'string' || password === '') {
    return res
      .status(400)
      .json({ success: false, message: 'Username and password are required' });
  }
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  if (header !== `Bearer ${TOKEN}`) {
    return res
      .status(401)
      .json({ success: false, message: 'Unauthorized: missing or invalid token' });
  }
  next();
}

app.use('/api/employees', requireAuth);

// Shared validation for create and edit. Returns { error } or { value }.
// Limits mirror the column types (VARCHAR(100), DECIMAL(12,2)).
const MAX_TEXT = 100;
const MAX_SALARY = 9999999999.99;
function validateEmployeeInput(body) {
  body = body || {};
  if (isBlank(body.name) || isBlank(body.position) || body.salary === undefined || body.salary === null) {
    return { error: 'Name, position and salary are required' };
  }
  const salary = parseSalary(body.salary);
  if (!Number.isFinite(salary) || salary <= 0) {
    return { error: 'Salary must be a positive number' };
  }
  if (salary > MAX_SALARY) {
    return { error: 'Salary is too large' };
  }
  const name = body.name.trim();
  const position = body.position.trim();
  if (name.length > MAX_TEXT || position.length > MAX_TEXT) {
    return { error: `Name and position must be at most ${MAX_TEXT} characters` };
  }
  return { value: { name, position, salary } };
}

// ---------- Employees ----------
app.get(
  '/api/employees',
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${EMPLOYEE_COLS} FROM LeeSup_employees ORDER BY LeeSup_id`
    );
    res.status(200).json({ success: true, data: rows.map(toEmployee) });
  })
);

// NOTE: must be registered BEFORE any /api/employees/:id routes.
app.get(
  '/api/employees/salary-clusters',
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${EMPLOYEE_COLS} FROM LeeSup_employees ORDER BY LeeSup_id`
    );
    const employees = rows.map(toEmployee);

    if (employees.length === 0) {
      return res.status(200).json({
        success: true,
        totalEmployees: 0,
        iterations: 0,
        clusters: [],
        message: 'No employees to analyze',
      });
    }

    const salaries = employees.map((e) => e.salary);
    const { centroids, assignments, iterations } = kmeans1D(salaries, 3);

    const clusters = centroids.map((centroid, idx) => {
      const memberEmployees = employees.filter((_, i) => assignments[i] === idx);
      const members = memberEmployees.map((e) => e.salary);
      return {
        centroid: Math.round(centroid),
        count: members.length,
        min: members.length ? Math.min(...members) : null,
        max: members.length ? Math.max(...members) : null,
        members: memberEmployees.map((e) => e.name),
        _raw: centroid,
      };
    });

    clusters.sort((a, b) => a._raw - b._raw);
    const result = clusters.map(({ _raw, ...c }, i) => ({ group: `Tier ${i + 1}`, ...c }));

    res
      .status(200)
      .json({ success: true, totalEmployees: employees.length, iterations, clusters: result });
  })
);

app.post(
  '/api/employees',
  wrap(async (req, res) => {
    const { error, value } = validateEmployeeInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const [result] = await pool.query(
      `INSERT INTO LeeSup_employees (LeeSup_name, LeeSup_position, LeeSup_status, LeeSup_salary)
       VALUES (?, ?, 'Active', ?)`,
      [value.name, value.position, value.salary]
    );
    const employee = await findEmployee(result.insertId);
    res.status(201).json({ success: true, data: employee });
  })
);

// Edit name/position/salary (status is changed only via the /status route).
app.put(
  '/api/employees/:id',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id) || !(await findEmployee(id))) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const { error, value } = validateEmployeeInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    await pool.query(
      `UPDATE LeeSup_employees
       SET LeeSup_name = ?, LeeSup_position = ?, LeeSup_salary = ?
       WHERE LeeSup_id = ?`,
      [value.name, value.position, value.salary, id]
    );
    const employee = await findEmployee(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.status(200).json({ success: true, data: employee });
  })
);

app.put(
  '/api/employees/:id/status',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    // Single atomic UPDATE flips the status.
    await pool.query(
      `UPDATE LeeSup_employees
       SET LeeSup_status = CASE WHEN LeeSup_status = 'Active' THEN 'On Leave' ELSE 'Active' END
       WHERE LeeSup_id = ?`,
      [id]
    );
    const employee = await findEmployee(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.status(200).json({ success: true, data: employee });
  })
);

app.delete(
  '/api/employees/:id',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const [result] = await pool.query('DELETE FROM LeeSup_employees WHERE LeeSup_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, message: 'Employee deleted' });
  })
);

// ---------- 404 + error handlers ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// A stray rejected promise must never take the API down.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API running on http://0.0.0.0:${PORT}`);
    // Informational only: the server keeps running (returning 500s) if the DB is down.
    pool
      .query('SELECT 1')
      .then(() => console.log('Database connection OK'))
      .catch((e) => console.error(`Database not reachable: ${e.code || ''} ${e.message}`));
  });
}

module.exports = app;
