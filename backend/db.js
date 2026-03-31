const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    passwordHash TEXT,
    role TEXT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    position TEXT,
    dept TEXT,
    status TEXT,
    salary REAL DEFAULT 0,
    profileImage TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER,
    startDate TEXT,
    endDate TEXT,
    days INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    managerId INTEGER,
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payrolls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER,
    month INTEGER,
    year INTEGER,
    gross REAL,
    net REAL,
    details TEXT
  )`);

  // Safe migrations: add columns if they don't exist yet
  db.run("ALTER TABLE employees ADD COLUMN email TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN userId INTEGER", () => {});
  db.run("ALTER TABLE employees ADD COLUMN birthDate TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN birthPlace TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN contractType TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN phone TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN address TEXT", () => {});
  db.run("ALTER TABLE employees ADD COLUMN gender TEXT", () => {});

  // Leaves extra fields migrations
  db.run("ALTER TABLE leaves ADD COLUMN leaveType TEXT", () => {});
  db.run("ALTER TABLE leaves ADD COLUMN interimName TEXT", () => {});
  db.run("ALTER TABLE leaves ADD COLUMN interimFunction TEXT", () => {});
  db.run("ALTER TABLE leaves ADD COLUMN interimEmployeeId INTEGER", () => {});

  // Contracts table
  db.run(
    `CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER,
    type TEXT,
    startDate TEXT,
    endDate TEXT,
    isActive INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY(employeeId) REFERENCES employees(id)
  )`,
    () => {},
  );

  // Notifications table
  db.run(
    `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    message TEXT,
    type TEXT DEFAULT 'info',
    isRead INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
    () => {},
  );
});

// Ensure a default admin exists for first-run convenience
db.get("SELECT COUNT(*) as cnt FROM users", (err, row) => {
  if (err) {
    console.error("Error checking users table:", err);
    return;
  }
  if (row && row.cnt === 0) {
    const email = "admin@insuite.ci";
    const password = "password123";
    const salt = bcrypt.genSaltSync(8);
    const passwordHash = bcrypt.hashSync(password, salt);
    db.run(
      "INSERT INTO users (email, passwordHash, role, name) VALUES (?, ?, ?, ?)",
      [email, passwordHash, "admin", "Admin"],
      function (e) {
        if (e) console.error("Failed to insert default admin:", e);
        else console.log("Default admin created:", email);
      },
    );
  }
});

module.exports = db;
