const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "uploads", "profiles")),
  filename: (req, file, cb) =>
    cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Middleware: verify token
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });
  const token = auth.split(" ")[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

function requireRole(roles = []) {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;
    if (!userRole) return res.status(403).json({ message: "Missing role" });
    if (!roles.includes(userRole))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// Auth routes
app.post("/api/register", (req, res) => {
  const { email, password, role = "employee", name } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });
  const salt = bcrypt.genSaltSync(8);
  const passwordHash = bcrypt.hashSync(password, salt);
  const stmt = db.prepare(
    "INSERT INTO users (email, passwordHash, role, name) VALUES (?, ?, ?, ?)",
  );
  stmt.run(email, passwordHash, role, name || "", function (err) {
    if (err)
      return res.status(400).json({ message: "User exists or DB error", err });
    const token = jwt.sign({ id: this.lastID, role, email }, SECRET, {
      expiresIn: "8h",
    });
    res.json({ success: true, token });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error", err });
    if (!row) return res.status(401).json({ message: "Invalid creds" });
    if (!bcrypt.compareSync(password, row.passwordHash))
      return res.status(401).json({ message: "Invalid creds" });
    const token = jwt.sign(
      { id: row.id, role: row.role, email: row.email },
      SECRET,
      { expiresIn: "8h" },
    );
    res.json({ success: true, token, role: row.role, name: row.name });
  });
});

// Simple forgot-password endpoint (prototype): generate temporary password and update DB
app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Missing email" });
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error", err });
    if (!row) return res.status(404).json({ message: "User not found" });
    // generate a temporary password
    const temp =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4);
    const salt = bcrypt.genSaltSync(8);
    const hash = bcrypt.hashSync(temp, salt);
    db.run(
      "UPDATE users SET passwordHash = ? WHERE id = ?",
      [hash, row.id],
      function (e) {
        if (e) return res.status(500).json({ message: "DB update error", e });
        // In a real app we'd email the temp password. For this prototype we return it in response.
        res.json({ message: "Temporary password set", tempPassword: temp });
      },
    );
  });
});

// Employees CRUD
app.get("/api/employees", verifyToken, (req, res) => {
  db.all("SELECT * FROM employees", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", err });
    res.json(rows);
  });
});

app.post(
  "/api/employees",
  verifyToken,
  requireRole(["admin", "rh"]),
  upload.single("profilePicture"),
  (req, res) => {
    const { name, position, dept, status = "Actif", salary = 0 } = req.body;
    const profileImage = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : null;
    const stmt = db.prepare(
      "INSERT INTO employees (name, position, dept, status, salary, profileImage) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      name,
      position,
      dept,
      status,
      salary,
      profileImage,
      function (err) {
        if (err)
          return res.status(500).json({ message: "DB insert error", err });
        db.get(
          "SELECT * FROM employees WHERE id = ?",
          [this.lastID],
          (e, row) => {
            res.status(201).json({ message: "Employé ajouté", data: row });
          },
        );
      },
    );
  },
);

// Update employee photo
app.post(
  "/api/employees/:id/photo",
  verifyToken,
  requireRole(["admin", "rh"]),
  upload.single("profilePicture"),
  (req, res) => {
    const id = req.params.id;
    if (!req.file) return res.status(400).json({ message: "No file" });
    const profileImage = `/uploads/profiles/${req.file.filename}`;
    db.run(
      "UPDATE employees SET profileImage = ? WHERE id = ?",
      [profileImage, id],
      function (err) {
        if (err) return res.status(500).json({ message: "DB error", err });
        db.get("SELECT * FROM employees WHERE id = ?", [id], (e, row) => {
          if (e) return res.status(500).json({ message: "DB error", e });
          res.json({ message: "Photo updated", data: row });
        });
      },
    );
  },
);

app.put(
  "/api/employees/:id",
  verifyToken,
  requireRole(["admin", "rh"]),
  upload.single("profilePicture"),
  (req, res) => {
    const id = req.params.id;
    // fields may come from multipart form or JSON
    const { name, position, dept, status, salary } = req.body;
    const profileImage = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : null;
    // Build update query dynamically
    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (position !== undefined) {
      updates.push("position = ?");
      params.push(position);
    }
    if (dept !== undefined) {
      updates.push("dept = ?");
      params.push(dept);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }
    if (salary !== undefined) {
      updates.push("salary = ?");
      params.push(salary);
    }
    if (profileImage) {
      updates.push("profileImage = ?");
      params.push(profileImage);
    }
    if (updates.length === 0)
      return res.status(400).json({ message: "No fields to update" });
    params.push(id);
    const sql = `UPDATE employees SET ${updates.join(", ")} WHERE id = ?`;
    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ message: "DB update error", err });
      db.get("SELECT * FROM employees WHERE id = ?", [id], (e, row) => {
        if (e) return res.status(500).json({ message: "DB error", e });
        res.json({ message: "Updated", data: row });
      });
    });
  },
);

app.delete(
  "/api/employees/:id",
  verifyToken,
  requireRole(["admin"]),
  (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM employees WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "DB delete error", err });
      res.json({ message: "Deleted" });
    });
  },
);

// Leaves workflow
app.post("/api/leaves", verifyToken, (req, res) => {
  const { employeeId, startDate, endDate, days, reason, managerId } = req.body;
  const stmt = db.prepare(
    "INSERT INTO leaves (employeeId, startDate, endDate, days, reason, status, managerId) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  stmt.run(
    employeeId,
    startDate,
    endDate,
    days,
    reason,
    "pending",
    managerId || null,
    function (err) {
      if (err) return res.status(500).json({ message: "DB insert error", err });
      db.get("SELECT * FROM leaves WHERE id = ?", [this.lastID], (e, row) =>
        res.status(201).json({ data: row }),
      );
    },
  );
});

app.get("/api/leaves", verifyToken, (req, res) => {
  // managers can filter by managerId query
  const { managerId } = req.query;
  const sql = managerId
    ? "SELECT * FROM leaves WHERE managerId = ?"
    : "SELECT * FROM leaves";
  const params = managerId ? [managerId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", err });
    res.json(rows);
  });
});

app.put(
  "/api/leaves/:id/approve",
  verifyToken,
  requireRole(["manager", "rh", "admin"]),
  (req, res) => {
    const id = req.params.id;
    db.run(
      "UPDATE leaves SET status = ? WHERE id = ?",
      ["approved", id],
      function (err) {
        if (err) return res.status(500).json({ message: "DB error", err });
        res.json({ message: "Approved" });
      },
    );
  },
);

app.put(
  "/api/leaves/:id/reject",
  verifyToken,
  requireRole(["manager", "rh", "admin"]),
  (req, res) => {
    const id = req.params.id;
    db.run(
      "UPDATE leaves SET status = ? WHERE id = ?",
      ["rejected", id],
      function (err) {
        if (err) return res.status(500).json({ message: "DB error", err });
        res.json({ message: "Rejected" });
      },
    );
  },
);

// Payroll simple generator
app.post(
  "/api/payroll/generate",
  verifyToken,
  requireRole(["rh", "admin"]),
  (req, res) => {
    const { month, year } = req.body;
    if (!month || !year)
      return res.status(400).json({ message: "Missing month/year" });
    db.all("SELECT * FROM employees", [], (err, employees) => {
      if (err) return res.status(500).json({ message: "DB error", err });
      const payrolls = employees.map((emp) => {
        const gross = emp.salary || 0;
        const deductions = gross * 0.1; // simpliste
        const net = gross - deductions;
        return {
          employeeId: emp.id,
          month,
          year,
          gross,
          net,
          details: JSON.stringify({ deductions }),
        };
      });
      // not persisting for simplicity
      res.json({ month, year, payrolls });
    });
  },
);

app.listen(5000, () => console.log("Serveur backend sur le port 5000"));
