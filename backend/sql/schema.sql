-- HR Manager schema. No foreign keys or views (class DB user may lack REFERENCES / CREATE VIEW).
CREATE TABLE IF NOT EXISTS LeeSup_employees (
  LeeSup_id INT AUTO_INCREMENT PRIMARY KEY,
  LeeSup_name VARCHAR(100) NOT NULL,
  LeeSup_position VARCHAR(100) NOT NULL,
  LeeSup_status ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
  LeeSup_salary DECIMAL(12,2) NOT NULL
);

-- Seed data. `npm run db:init` runs this INSERT only while the table is empty, so it is safe to re-run.
INSERT INTO LeeSup_employees (LeeSup_name, LeeSup_position, LeeSup_status, LeeSup_salary) VALUES
  ('John Doe', 'Software Engineer', 'Active', 45000),
  ('Jane Smith', 'Project Manager', 'Active', 85000),
  ('Somchai Prasert', 'Junior Developer', 'Active', 18000),
  ('Emily Johnson', 'UX Designer', 'On Leave', 42000),
  ('Michael Brown', 'Engineering Director', 'Active', 95000),
  ('Napat Wong', 'Intern', 'Active', 15000),
  ('Sarah Davis', 'Data Analyst', 'Active', 48000),
  ('Kittipong Lee', 'Support Staff', 'On Leave', 20000),
  ('Olivia Martin', 'Senior Architect', 'Active', 90000),
  ('Daniel Garcia', 'QA Engineer', 'Active', 40000),
  ('Priya Patel', 'HR Specialist', 'Active', 17500),
  ('Liam Wilson', 'DevOps Engineer', 'Active', 80000);
