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
app.use(
  cors({
    origin: ["http://localhost:3000", "https://joel87-hosy.github.io"],
    credentials: true,
  }),
);
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
    const userId = this.lastID;
    // Link to employee record if email matches
    db.run(
      "UPDATE employees SET userId = ? WHERE email = ? AND (userId IS NULL OR userId = 0)",
      [userId, email],
      () => {},
    );
    const token = jwt.sign({ id: userId, role, email }, SECRET, {
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
    // Fetch linked employeeId if any
    db.get("SELECT id FROM employees WHERE userId = ?", [row.id], (e2, emp) => {
      res.json({
        success: true,
        token,
        role: row.role,
        name: row.name,
        employeeId: emp ? emp.id : null,
      });
    });
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
app.get("/api/employees/me", verifyToken, (req, res) => {
  db.get(
    "SELECT * FROM employees WHERE userId = ?",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "DB error", err });
      if (!row)
        return res
          .status(404)
          .json({ message: "No employee record linked to your account" });
      res.json(row);
    },
  );
});

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
    const {
      name,
      position,
      dept,
      status = "Actif",
      salary,
      email = "",
      birthDate,
      birthPlace,
      contractType,
      phone,
      address,
      gender,
    } = req.body;
    const salaryNum =
      salary !== undefined && salary !== ""
        ? parseFloat(String(salary).replace(/[^0-9.]/g, "")) || 0
        : 0;
    const profileImage = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : null;
    const stmt = db.prepare(
      `INSERT INTO employees
        (name, position, dept, status, salary, profileImage, email,
         birthDate, birthPlace, contractType, phone, address, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      name,
      position,
      dept,
      status,
      salaryNum,
      profileImage,
      email || null,
      birthDate || null,
      birthPlace || null,
      contractType || null,
      phone || null,
      address || null,
      gender || null,
      function (err) {
        if (err)
          return res.status(500).json({ message: "DB insert error", err });
        const newId = this.lastID;
        if (email) {
          db.get(
            "SELECT id FROM users WHERE email = ?",
            [email],
            (e2, user) => {
              if (user) {
                db.run(
                  "UPDATE employees SET userId = ? WHERE id = ? AND (userId IS NULL OR userId = 0)",
                  [user.id, newId],
                  () => {},
                );
              }
            },
          );
        }
        // Create initial contract record if contractType provided
        if (contractType) {
          db.run(
            "INSERT INTO contracts (employeeId, type, startDate, isActive) VALUES (?, ?, ?, 1)",
            [newId, contractType, new Date().toISOString().split("T")[0]],
            () => {},
          );
        }
        db.get("SELECT * FROM employees WHERE id = ?", [newId], (e, row) => {
          res.status(201).json({ message: "Employé ajouté", data: row });
        });
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
    const {
      name,
      position,
      dept,
      status,
      salary,
      email,
      birthDate,
      birthPlace,
      contractType,
      phone,
      address,
      gender,
    } = req.body;
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
      params.push(
        salary !== ""
          ? parseFloat(String(salary).replace(/[^0-9.]/g, "")) || 0
          : 0,
      );
    }
    if (email !== undefined) {
      updates.push("email = ?");
      params.push(email || null);
    }
    if (birthDate !== undefined) {
      updates.push("birthDate = ?");
      params.push(birthDate || null);
    }
    if (birthPlace !== undefined) {
      updates.push("birthPlace = ?");
      params.push(birthPlace || null);
    }
    if (contractType !== undefined) {
      updates.push("contractType = ?");
      params.push(contractType || null);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(phone || null);
    }
    if (address !== undefined) {
      updates.push("address = ?");
      params.push(address || null);
    }
    if (gender !== undefined) {
      updates.push("gender = ?");
      params.push(gender || null);
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
      // If email was updated, try to link to existing user account
      if (email) {
        db.get("SELECT id FROM users WHERE email = ?", [email], (e2, user) => {
          if (user) {
            db.run(
              "UPDATE employees SET userId = ? WHERE id = ? AND (userId IS NULL OR userId = 0)",
              [user.id, id],
              () => {},
            );
          }
        });
      }
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
  const {
    employeeId,
    startDate,
    endDate,
    days,
    reason,
    managerId,
    leaveType,
    interimName,
    interimFunction,
    interimEmployeeId,
  } = req.body;
  const stmt = db.prepare(
    "INSERT INTO leaves (employeeId, startDate, endDate, days, reason, status, managerId, leaveType, interimName, interimFunction, interimEmployeeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  stmt.run(
    employeeId,
    startDate,
    endDate,
    days,
    reason,
    "pending",
    managerId || null,
    leaveType || null,
    interimName || null,
    interimFunction || null,
    interimEmployeeId || null,
    function (err) {
      if (err) return res.status(500).json({ message: "DB insert error", err });
      db.get("SELECT * FROM leaves WHERE id = ?", [this.lastID], (e, row) =>
        res.status(201).json({ data: row }),
      );
    },
  );
});

app.get("/api/leaves", verifyToken, (req, res) => {
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

// Returns only the leaves for the currently logged-in employee
app.get("/api/leaves/my", verifyToken, (req, res) => {
  db.get(
    "SELECT id FROM employees WHERE userId = ?",
    [req.user.id],
    (err, emp) => {
      if (err) return res.status(500).json({ message: "DB error", err });
      if (!emp) return res.json([]);
      db.all(
        "SELECT * FROM leaves WHERE employeeId = ? ORDER BY id DESC",
        [emp.id],
        (e2, rows) => {
          if (e2) return res.status(500).json({ message: "DB error", e2 });
          res.json(rows);
        },
      );
    },
  );
});

// Helper: send notification to a user
function createNotification(userId, message, type = "info") {
  if (!userId) return;
  db.run(
    "INSERT INTO notifications (userId, message, type) VALUES (?, ?, ?)",
    [userId, message, type],
    () => {},
  );
}

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
        // Notify employee
        db.get(
          "SELECT l.*, e.userId FROM leaves l LEFT JOIN employees e ON l.employeeId = e.id WHERE l.id = ?",
          [id],
          (e2, row) => {
            if (row && row.userId) {
              createNotification(
                row.userId,
                `✅ Votre demande de ${row.reason || "congé"} (${row.startDate} → ${row.endDate}) a été approuvée.`,
                "success",
              );
            }
          },
        );
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
        // Notify employee
        db.get(
          "SELECT l.*, e.userId FROM leaves l LEFT JOIN employees e ON l.employeeId = e.id WHERE l.id = ?",
          [id],
          (e2, row) => {
            if (row && row.userId) {
              createNotification(
                row.userId,
                `❌ Votre demande de ${row.reason || "congé"} (${row.startDate} → ${row.endDate}) a été refusée.`,
                "error",
              );
            }
          },
        );
        res.json({ message: "Rejected" });
      },
    );
  },
);

// Contracts endpoints
app.get("/api/contracts/my", verifyToken, (req, res) => {
  db.get(
    "SELECT id FROM employees WHERE userId = ?",
    [req.user.id],
    (err, emp) => {
      if (err) return res.status(500).json({ message: "DB error", err });
      if (!emp) return res.json([]);
      db.all(
        "SELECT * FROM contracts WHERE employeeId = ? ORDER BY isActive DESC, id DESC",
        [emp.id],
        (e2, rows) => res.json(rows || []),
      );
    },
  );
});

app.get(
  "/api/contracts/:employeeId",
  verifyToken,
  requireRole(["admin", "rh", "manager"]),
  (req, res) => {
    db.all(
      "SELECT * FROM contracts WHERE employeeId = ? ORDER BY isActive DESC, id DESC",
      [req.params.employeeId],
      (err, rows) => res.json(rows || []),
    );
  },
);

// Notifications endpoints
app.get("/api/notifications", verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC LIMIT 50",
    [req.user.id],
    (err, rows) => res.json(rows || []),
  );
});

app.put("/api/notifications/:id/read", verifyToken, (req, res) => {
  db.run(
    "UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?",
    [req.params.id, req.user.id],
    () => res.json({ ok: true }),
  );
});

app.put("/api/notifications/read-all", verifyToken, (req, res) => {
  db.run(
    "UPDATE notifications SET isRead = 1 WHERE userId = ?",
    [req.user.id],
    () => res.json({ ok: true }),
  );
});

// Update own profile (employee settings)
app.put("/api/profile", verifyToken, (req, res) => {
  const { name, phone, address } = req.body;
  const updates = [];
  const params = [];
  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }
  if (updates.length > 0) {
    params.push(req.user.id);
    db.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params,
      () => {},
    );
  }
  // Also update employee record if linked
  const empUpdates = [];
  const empParams = [];
  if (phone !== undefined) {
    empUpdates.push("phone = ?");
    empParams.push(phone || null);
  }
  if (address !== undefined) {
    empUpdates.push("address = ?");
    empParams.push(address || null);
  }
  if (empUpdates.length > 0) {
    empParams.push(req.user.id);
    db.run(
      `UPDATE employees SET ${empUpdates.join(", ")} WHERE userId = ?`,
      empParams,
      () => {},
    );
  }
  res.json({ ok: true });
});

// Change password
app.put("/api/change-password", verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Champs requis" });
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user)
      return res.status(404).json({ message: "Utilisateur introuvable" });
    if (!bcrypt.compareSync(currentPassword, user.passwordHash))
      return res.status(401).json({ message: "Mot de passe actuel incorrect" });
    const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(8));
    db.run(
      "UPDATE users SET passwordHash = ? WHERE id = ?",
      [hash, req.user.id],
      () => res.json({ ok: true }),
    );
  });
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur backend sur le port ${PORT}`));
