const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

// â”€â”€ Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Render env vars
// Development: falls back to a local SQLite file (data.db)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// â”€â”€ Helper: convert a libsql ResultSet into plain JSON-safe objects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// libsql returns INTEGER columns as BigInt; convert to Number for JSON safety.
function convertRows(resultSet) {
  const { columns, rows } = resultSet;
  return rows.map((row) => {
    const obj = {};
    for (let i = 0; i < columns.length; i++) {
      const v = row[i];
      obj[columns[i]] = typeof v === "bigint" ? Number(v) : v;
    }
    return obj;
  });
}

// â”€â”€ Database initialisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(async () => {
  // Create tables â€” safe to run on every boot (IF NOT EXISTS)
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT UNIQUE,
       passwordHash TEXT,
       role TEXT,
       name TEXT
     )`,
    `CREATE TABLE IF NOT EXISTS employees (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT, position TEXT, dept TEXT, status TEXT,
       salary REAL DEFAULT 0, profileImage TEXT
     )`,
    `CREATE TABLE IF NOT EXISTS leaves (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       employeeId INTEGER, startDate TEXT, endDate TEXT, days INTEGER,
       reason TEXT, status TEXT DEFAULT 'pending', managerId INTEGER,
       FOREIGN KEY(employeeId) REFERENCES employees(id)
     )`,
    `CREATE TABLE IF NOT EXISTS payrolls (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       employeeId INTEGER, month INTEGER, year INTEGER,
       gross REAL, net REAL, details TEXT
     )`,
    `CREATE TABLE IF NOT EXISTS contracts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       employeeId INTEGER, type TEXT, startDate TEXT, endDate TEXT,
       isActive INTEGER DEFAULT 1, notes TEXT,
       FOREIGN KEY(employeeId) REFERENCES employees(id)
     )`,
    `CREATE TABLE IF NOT EXISTS notifications (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       userId INTEGER, message TEXT, type TEXT DEFAULT 'info',
       isRead INTEGER DEFAULT 0,
       createdAt TEXT DEFAULT (datetime('now')),
       FOREIGN KEY(userId) REFERENCES users(id)
     )`,
  ];

  for (const sql of tables) {
    try {
      await client.execute(sql);
    } catch (e) {
      console.error("Table init error:", e.message);
    }
  }

  // Safe column migrations â€” silently ignored if the column already exists
  const migrations = [
    "ALTER TABLE employees ADD COLUMN email TEXT",
    "ALTER TABLE employees ADD COLUMN userId INTEGER",
    "ALTER TABLE employees ADD COLUMN birthDate TEXT",
    "ALTER TABLE employees ADD COLUMN birthPlace TEXT",
    "ALTER TABLE employees ADD COLUMN contractType TEXT",
    "ALTER TABLE employees ADD COLUMN phone TEXT",
    "ALTER TABLE employees ADD COLUMN address TEXT",
    "ALTER TABLE employees ADD COLUMN gender TEXT",
    "ALTER TABLE employees ADD COLUMN annualLeaveAllowed INTEGER DEFAULT 22",
    "ALTER TABLE employees ADD COLUMN permissionDaysAllowed INTEGER DEFAULT 5",
    "ALTER TABLE leaves ADD COLUMN leaveType TEXT",
    "ALTER TABLE leaves ADD COLUMN interimName TEXT",
    "ALTER TABLE leaves ADD COLUMN interimFunction TEXT",
    "ALTER TABLE leaves ADD COLUMN interimEmployeeId INTEGER",
  ];

  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch (_) {
      // Column already exists â€” expected on subsequent boots
    }
  }

  // Create default admin account on first run
  try {
    const r = await client.execute("SELECT COUNT(*) as cnt FROM users");
    const cnt = convertRows(r)[0]?.cnt ?? 0;
    if (Number(cnt) === 0) {
      const hash = bcrypt.hashSync("password123", bcrypt.genSaltSync(8));
      await client.execute({
        sql: "INSERT INTO users (email, passwordHash, role, name) VALUES (?, ?, ?, ?)",
        args: ["admin@insuite.ci", hash, "admin", "Admin"],
      });
      console.log("Default admin created: admin@insuite.ci");
    }
  } catch (e) {
    console.error("Admin init error:", e.message);
  }

  console.log("âœ… Database initialised.");
})();

// â”€â”€ sqlite3-compatible wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Exposes the same API as the sqlite3 module so server.js needs no changes.

const db = {
  /** Fetch a single row. Like sqlite3: db.get(sql, params, callback) */
  get(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    client
      .execute({ sql, args: params || [] })
      .then((r) => {
        const rows = convertRows(r);
        if (cb) cb(null, rows[0] || null);
      })
      .catch((e) => {
        if (cb) cb(e, null);
      });
  },

  /** Fetch all rows. Like sqlite3: db.all(sql, params, callback) */
  all(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    client
      .execute({ sql, args: params || [] })
      .then((r) => {
        if (cb) cb(null, convertRows(r));
      })
      .catch((e) => {
        if (cb) cb(e, []);
      });
  },

  /**
   * Execute INSERT/UPDATE/DELETE. Like sqlite3: db.run(sql, params, callback)
   * Callback receives `this` = { lastID, changes }.
   */
  run(sql, params, cb) {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    client
      .execute({ sql, args: params || [] })
      .then((r) => {
        const ctx = {
          lastID: Number(r.lastInsertRowid ?? 0),
          changes: r.rowsAffected ?? 0,
        };
        if (cb) cb.call(ctx, null);
      })
      .catch((e) => {
        if (cb) cb.call({ lastID: 0, changes: 0 }, e);
      });
  },

  /**
   * Prepare for single-use run.
   * Usage: const stmt = db.prepare(sql); stmt.run(p1, p2, ..., callback)
   */
  prepare(sql) {
    return {
      run(...rest) {
        const cb =
          typeof rest[rest.length - 1] === "function" ? rest.pop() : null;
        const args = rest;
        client
          .execute({ sql, args })
          .then((r) => {
            const ctx = {
              lastID: Number(r.lastInsertRowid ?? 0),
              changes: r.rowsAffected ?? 0,
            };
            if (cb) cb.call(ctx, null);
          })
          .catch((e) => {
            if (cb) cb.call({ lastID: 0, changes: 0 }, e);
          });
      },
    };
  },

  /** No-op: libsql handles serialisation internally. */
  serialize(fn) {
    if (fn) fn();
  },
};

module.exports = db;
