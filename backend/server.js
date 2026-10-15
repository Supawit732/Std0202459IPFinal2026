const express = require('express');
const cors = require('cors');
const { kmeans1D } = require('./kmeans');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = 'mock-jwt-token';

app.use(cors());
app.use(express.json());

// ---------- In-memory data ----------
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'Project Manager', status: 'Active', salary: 85000 },
  { id: '3', name: 'Somchai Prasert', position: 'Junior Developer', status: 'Active', salary: 18000 },
  { id: '4', name: 'Emily Johnson', position: 'UX Designer', status: 'On Leave', salary: 42000 },
  { id: '5', name: 'Michael Brown', position: 'Engineering Director', status: 'Active', salary: 95000 },
  { id: '6', name: 'Napat Wong', position: 'Intern', status: 'Active', salary: 15000 },
  { id: '7', name: 'Sarah Davis', position: 'Data Analyst', status: 'Active', salary: 48000 },
  { id: '8', name: 'Kittipong Lee', position: 'Support Staff', status: 'On Leave', salary: 20000 },
  { id: '9', name: 'Olivia Martin', position: 'Senior Architect', status: 'Active', salary: 90000 },
  { id: '10', name: 'Daniel Garcia', position: 'QA Engineer', status: 'Active', salary: 40000 },
  { id: '11', name: 'Priya Patel', position: 'HR Specialist', status: 'Active', salary: 17500 },
  { id: '12', name: 'Liam Wilson', position: 'DevOps Engineer', status: 'Active', salary: 80000 },
];
// Incrementing counter; never reused after a delete.
let nextId = employees.length + 1;

// ---------- Helpers ----------
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

// ---------- Employees ----------
app.get('/api/employees', (req, res) => {
  res.status(200).json({ success: true, data: employees });
});

// NOTE: must be registered BEFORE any /api/employees/:id routes.
app.get('/api/employees/salary-clusters', (req, res) => {
  if (employees.length === 0) {
    return res.status(200).json({
      success: true,
      totalEmployees: 0,
      clusters: [],
      message: 'No employees to analyze',
    });
  }

  const salaries = employees.map((e) => e.salary);
  const { centroids, assignments } = kmeans1D(salaries, 3);

  const clusters = centroids.map((centroid, idx) => {
    const members = salaries.filter((_, i) => assignments[i] === idx);
    return {
      centroid: Math.round(centroid),
      count: members.length,
      min: members.length ? Math.min(...members) : null,
      max: members.length ? Math.max(...members) : null,
      _raw: centroid,
    };
  });

  clusters.sort((a, b) => a._raw - b._raw);
  const result = clusters.map(({ _raw, ...c }, i) => ({ group: `Tier ${i + 1}`, ...c }));

  res.status(200).json({ success: true, totalEmployees: employees.length, clusters: result });
});

app.post('/api/employees', (req, res) => {
  const body = req.body || {};
  if (isBlank(body.name) || isBlank(body.position) || body.salary === undefined || body.salary === null) {
    return res
      .status(400)
      .json({ success: false, message: 'Name, position and salary are required' });
  }
  const salary = parseSalary(body.salary);
  if (!Number.isFinite(salary) || salary <= 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Salary must be a positive number' });
  }
  const employee = {
    id: String(nextId++),
    name: body.name.trim(),
    position: body.position.trim(),
    status: 'Active',
    salary,
  };
  employees.push(employee);
  res.status(201).json({ success: true, data: employee });
});

app.put('/api/employees/:id/status', (req, res) => {
  const emp = employees.find((e) => e.id === req.params.id);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
  emp.status = emp.status === 'Active' ? 'On Leave' : 'Active';
  res.status(200).json({ success: true, data: emp });
});

app.delete('/api/employees/:id', (req, res) => {
  const idx = employees.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Employee not found' });
  employees.splice(idx, 1);
  res.status(200).json({ success: true, message: 'Employee deleted' });
});

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

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`API running on http://0.0.0.0:${PORT}`));
}

module.exports = app;
