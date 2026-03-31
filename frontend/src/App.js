// ...existing code...

import { useEffect, useState } from "react";
import "./styles.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [register, setRegister] = useState({
    email: "",
    password: "",
    name: "",
    role: "employee",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    position: "",
    dept: "",
    salary: "",
    email: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Toast helper
  function pushToast(message, type = "info", duration = 3000) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }

  // Registration handler
  async function handleRegister(e) {
    e.preventDefault();
    setRegisterError("");
    if (!register.email || !register.password || !register.name) {
      setRegisterError("Tous les champs sont requis");
      return;
    }
    setRegisterLoading(true);
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(register),
    });
    setRegisterLoading(false);
    if (res.ok) {
      pushToast("Compte créé, connectez-vous", "success");
      setShowRegister(false);
      setRegister({ email: "", password: "", name: "", role: "employee" });
    } else {
      const err = await res.json();
      setRegisterError(err.message || "Erreur lors de l'inscription");
    }
  }

  // Login handler
  async function handleLogin(e) {
    e.preventDefault();
    if (!login.email || !login.password) {
      pushToast("Email et mot de passe requis", "error");
      return;
    }
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      setRole(data.role);
      setName(data.name);
      setEmployeeId(data.employeeId || null);
      setLogin({ email: "", password: "" });
      pushToast("Connecté", "success");
    } else {
      const err = await res.json();
      pushToast(err.message || "Erreur de connexion", "error");
    }
  }

  // Load data after login
  useEffect(() => {
    if (token && role) {
      fetchEmployees();
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  async function fetchEmployees() {
    if (!token) return;
    if (role === "employee") {
      const res = await fetch(`${API}/employees/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeRecord(data);
        setEmployees([data]);
      } else {
        setEmployeeRecord(null);
        setEmployees([]);
      }
    } else {
      const res = await fetch(`${API}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEmployees(await res.json());
    }
  }

  // Dummy handleAddEmployee/handleUpdateEmployee for now
  async function handleAddEmployee(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("name", form.name);
    data.append("position", form.position);
    data.append("dept", form.dept);
    data.append("salary", form.salary);
    if (form.email) data.append("email", form.email);
    if (file) data.append("profilePicture", file);
    const res = await fetch(`${API}/employees`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      pushToast("Employé ajouté", "success");
      setForm({ name: "", position: "", dept: "", salary: "", email: "" });
      setFile(null);
      fetchEmployees();
    } else {
      const err = await res.json();
      pushToast("Erreur: " + (err.message || "erreur"), "error");
    }
  }

  async function handleUpdateEmployee(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("name", form.name);
    data.append("position", form.position);
    data.append("dept", form.dept);
    data.append("salary", form.salary);
    if (form.email) data.append("email", form.email);
    if (file) data.append("profilePicture", file);
    const res = await fetch(`${API}/employees/${editingId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      pushToast("Employé mis à jour", "success");
      cancelEdit();
      fetchEmployees();
    } else {
      const err = await res.json();
      pushToast("Erreur: " + (err.message || "erreur"), "error");
    }
  }

  function handleEditClick(emp) {
    setEditingId(emp.id);
    setForm({
      name: emp.name || "",
      position: emp.position || "",
      dept: emp.dept || "",
      salary: emp.salary || 0,
      email: emp.email || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    setModal({
      title: "Supprimer employé",
      message: "Confirmer la suppression de cet employé ?",
      async onConfirm() {
        setModal(null);
        const res = await fetch(`${API}/employees/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          pushToast("Employé supprimé", "success");
          fetchEmployees();
        } else {
          const err = await res.json();
          pushToast(
            "Erreur suppression: " + (err.message || "erreur"),
            "error",
          );
        }
      },
      onCancel() {
        setModal(null);
      },
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", position: "", dept: "", salary: "", email: "" });
    setFile(null);
  }

  async function fetchLeaves() {
    if (!token) return;
    const endpoint = role === "employee" ? `${API}/leaves/my` : `${API}/leaves`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeaves(await res.json());
  }

  async function requestLeave(e) {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      pushToast("Remplissez tous les champs", "error");
      return;
    }
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const days = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
    );
    const empId = employeeRecord ? employeeRecord.id : employeeId;
    if (!empId) {
      pushToast(
        "Aucune fiche employé liée à votre compte. Contactez le RH.",
        "error",
        5000,
      );
      return;
    }
    const body = {
      employeeId: empId,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days,
      reason: leaveForm.reason,
    };
    const res = await fetch(`${API}/leaves`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setLeaveForm({ startDate: "", endDate: "", reason: "" });
      fetchLeaves();
      pushToast("Demande de congé envoyée", "success");
    } else {
      pushToast("Erreur lors de la demande de congé", "error");
    }
  }

  async function approveLeave(id) {
    const res = await fetch(`${API}/leaves/${id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      pushToast("Demande approuvée", "success");
      fetchLeaves();
    } else {
      const err = await res.json();
      pushToast("Erreur approbation: " + (err.message || "erreur"), "error");
    }
  }

  async function rejectLeave(id) {
    const res = await fetch(`${API}/leaves/${id}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      pushToast("Demande rejetée", "success");
      fetchLeaves();
    } else {
      const err = await res.json();
      pushToast("Erreur rejet: " + (err.message || "erreur"), "error");
    }
  }

  if (!token) {
    if (showRegister) {
      return (
        <div className="auth-bg">
          <div className="auth-card">
            <div className="auth-logo">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="#2563eb" />
                <path
                  d="M10 26v-2a6 6 0 0112 0v2"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="18" cy="14" r="4" stroke="#fff" strokeWidth="2.2" />
              </svg>
              <span className="auth-logo-text">HRSuite</span>
            </div>
            <h2 className="auth-title">Créer un compte</h2>
            <p className="auth-subtitle">Rejoignez votre équipe RH</p>
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Nom complet</label>
                <input
                  className="auth-input"
                  value={register.name}
                  onChange={(e) =>
                    setRegister({ ...register, name: e.target.value })
                  }
                  placeholder="Jean Dupont"
                  autoComplete="name"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Adresse email</label>
                <input
                  className="auth-input"
                  value={register.email}
                  onChange={(e) =>
                    setRegister({ ...register, email: e.target.value })
                  }
                  type="email"
                  placeholder="jean@entreprise.com"
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Mot de passe</label>
                <input
                  className="auth-input"
                  value={register.password}
                  onChange={(e) =>
                    setRegister({ ...register, password: e.target.value })
                  }
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              {registerError && (
                <div className="auth-error">{registerError}</div>
              )}
              <button
                className="auth-btn"
                type="submit"
                disabled={registerLoading}
              >
                {registerLoading ? "Création en cours..." : "Créer mon compte"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setShowRegister(false)}
              >
                Déjà un compte ? <strong>Se connecter</strong>
              </button>
            </form>
          </div>
          <div className="toasts" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`toast ${t.type}`}>
                {t.message}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="auth-bg">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#2563eb" />
              <path
                d="M10 26v-2a6 6 0 0112 0v2"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="18" cy="14" r="4" stroke="#fff" strokeWidth="2.2" />
            </svg>
            <span className="auth-logo-text">HRSuite</span>
          </div>
          <h2 className="auth-title">Bienvenue 👋</h2>
          <p className="auth-subtitle">Connectez-vous à votre espace RH</p>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Adresse email</label>
              <input
                className="auth-input"
                value={login.email}
                onChange={(e) => setLogin({ ...login, email: e.target.value })}
                type="email"
                placeholder="admin@insuite.ci"
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Mot de passe</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input"
                  value={login.password}
                  onChange={(e) =>
                    setLogin({ ...login, password: e.target.value })
                  }
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Afficher/masquer le mot de passe"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div className="auth-forgot">
              <button
                type="button"
                className="auth-link-sm"
                onClick={async () => {
                  const email = window.prompt(
                    "Entrez votre email pour réinitialiser le mot de passe",
                  );
                  if (!email) return;
                  try {
                    const res = await fetch(`${API}/forgot-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      pushToast("Mot de passe réinitialisé.", "success", 8000);
                      setTimeout(
                        () =>
                          alert(
                            "Mot de passe temporaire: " +
                              (data.tempPassword || "—"),
                          ),
                        50,
                      );
                    } else {
                      const err = await res.json();
                      pushToast(
                        "Erreur: " + (err.message || "erreur"),
                        "error",
                      );
                    }
                  } catch (e) {
                    pushToast("Erreur réseau", "error");
                  }
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <button className="auth-btn" type="submit">
              Se connecter
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => setShowRegister(true)}
            >
              Pas encore de compte ? <strong>Créer un compte</strong>
            </button>
          </form>
        </div>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Interface principale après connexion
  return (
    <div className="app">
      {/* Barre mobile avec hamburger */}
      <div className="mobile-topbar">
        <div className="brand">HRSuite</div>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      {/* Overlay fond quand menu ouvert */}
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <div className="brand">HRSuite</div>
        <div className="user">Connecté: {name || "utilisateur"}</div>
        <div className="side-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              fetchEmployees();
              fetchLeaves();
              setMenuOpen(false);
            }}
          >
            Rafraîchir
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setToken(null);
              setRole(null);
              setMenuOpen(false);
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="container">
          <div className="header">
            <div className="title">
              {role === "employee" && "Mon Profil"}
              {role === "manager" && "Gestion du Personnel"}
              {role === "admin" && "Administration RH"}
            </div>
            <div style={{ color: "var(--muted)" }}>Système RH • Prototype</div>
          </div>
          <div className="grid-2" style={{ marginTop: 18 }}>
            {/* Employé: Affiche seulement ses infos et demandes de congé */}
            {role === "employee" && (
              <>
                <div>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Ma fiche employé</h3>
                    {employeeRecord ? (
                      <div className="employee-profile">
                        <div className="employee-profile-photo">
                          {employeeRecord.profileImage ? (
                            <img
                              src={`${API.replace("/api", "")}${employeeRecord.profileImage}`}
                              alt="profile"
                              className="profile-photo"
                            />
                          ) : (
                            <div className="profile-photo-placeholder">
                              {employeeRecord.name
                                ? employeeRecord.name[0].toUpperCase()
                                : "?"}
                            </div>
                          )}
                        </div>
                        <div className="employee-profile-info">
                          <div className="profile-name">
                            {employeeRecord.name}
                          </div>
                          <div className="profile-badge">
                            {employeeRecord.position}
                          </div>
                          <div className="profile-fields">
                            <div className="profile-field">
                              <span className="profile-field-label">
                                Département
                              </span>
                              <span className="profile-field-value">
                                {employeeRecord.dept || "—"}
                              </span>
                            </div>
                            <div className="profile-field">
                              <span className="profile-field-label">
                                Statut
                              </span>
                              <span className="profile-field-value profile-status">
                                {employeeRecord.status || "Actif"}
                              </span>
                            </div>
                            <div className="profile-field">
                              <span className="profile-field-label">
                                Salaire
                              </span>
                              <span className="profile-field-value">
                                {employeeRecord.salary != null &&
                                employeeRecord.salary !== ""
                                  ? `${Number(employeeRecord.salary).toLocaleString("fr-FR")} FCFA`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="profile-not-linked">
                        <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Fiche non liée
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 14 }}>
                          Votre compte n&apos;est pas encore lié à une fiche
                          employé.
                          <br />
                          Contactez le service RH en leur donnant votre adresse
                          email.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>
                      Demande de congé / permission
                    </h3>
                    {!employeeRecord && (
                      <div
                        style={{
                          color: "var(--danger)",
                          fontSize: 14,
                          marginBottom: 10,
                        }}
                      >
                        Votre fiche employé doit être liée pour soumettre une
                        demande.
                      </div>
                    )}
                    <form onSubmit={requestLeave} className="leave-form">
                      <div className="leave-form-row">
                        <div>
                          <label className="form-label">Date de début</label>
                          <input
                            className="input"
                            type="date"
                            value={leaveForm.startDate}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                startDate: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label">Date de fin</label>
                          <input
                            className="input"
                            type="date"
                            value={leaveForm.endDate}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                endDate: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Motif</label>
                        <input
                          className="input"
                          value={leaveForm.reason}
                          onChange={(e) =>
                            setLeaveForm({
                              ...leaveForm,
                              reason: e.target.value,
                            })
                          }
                          placeholder="Ex: Congés annuels, Permission..."
                          required
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={!employeeRecord}
                      >
                        Envoyer la demande
                      </button>
                    </form>
                    <h4 style={{ marginTop: 20, marginBottom: 8 }}>
                      Historique de mes demandes
                    </h4>
                    <div className="leave-list">
                      {leaves.length === 0 && (
                        <div style={{ color: "var(--muted)", fontSize: 14 }}>
                          Aucune demande pour l&apos;instant.
                        </div>
                      )}
                      {leaves.map((l) => (
                        <div className="leave-item" key={l.id}>
                          <div className="leave-item-dates">
                            {l.startDate} → {l.endDate}{" "}
                            <span className="leave-days">({l.days}j)</span>
                          </div>
                          <div className="leave-item-reason">{l.reason}</div>
                          <div
                            className={`leave-status leave-status-${l.status}`}
                          >
                            {l.status === "pending" && "⏳ En attente"}
                            {l.status === "approved" && "✅ Approuvé"}
                            {l.status === "rejected" && "❌ Refusé"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Manager: Peut voir tous les employés et approuver/rejeter les congés */}
            {role === "manager" && (
              <>
                <div>
                  <div className="card">
                    <form
                      onSubmit={(e) =>
                        editingId
                          ? handleUpdateEmployee(e)
                          : handleAddEmployee(e)
                      }
                      className="form-grid"
                    >
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Nom complet"
                      />
                      <input
                        className="input"
                        value={form.position}
                        onChange={(e) =>
                          setForm({ ...form, position: e.target.value })
                        }
                        placeholder="Poste"
                      />
                      <input
                        className="input"
                        value={form.dept}
                        onChange={(e) =>
                          setForm({ ...form, dept: e.target.value })
                        }
                        placeholder="Département"
                      />
                      <input
                        className="input"
                        value={form.salary}
                        onChange={(e) =>
                          setForm({ ...form, salary: e.target.value })
                        }
                        placeholder="Salaire"
                      />
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="Email professionnel"
                      />
                      <input
                        className="file"
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            className="img-preview"
                            alt="preview"
                          />
                        ) : editingId &&
                          employees.find((x) => x.id === editingId) &&
                          employees.find((x) => x.id === editingId)
                            .profileImage ? (
                          <img
                            src={`${API.replace("/api", "")}${employees.find((x) => x.id === editingId).profileImage}`}
                            className="img-preview"
                            alt="current"
                          />
                        ) : (
                          <div
                            style={{
                              width: 96,
                              height: 96,
                              background: "#f1f5f9",
                              borderRadius: 8,
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}
                      >
                        <button className="btn btn-primary" type="submit">
                          {editingId ? "Mettre à jour" : "Enregistrer"}
                        </button>
                        {editingId ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={cancelEdit}
                          >
                            Annuler
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                  <div className="card" style={{ marginTop: 16 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Nom</th>
                          <th>Poste</th>
                          <th>Dépt</th>
                          <th>Salaire</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((e) => (
                          <tr key={e.id}>
                            <td>
                              {e.profileImage ? (
                                <img
                                  src={`${API.replace("/api", "")}${e.profileImage}`}
                                  alt="profile"
                                  style={{
                                    width: 48,
                                    height: 48,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    background: "#f1f5f9",
                                    borderRadius: 8,
                                  }}
                                />
                              )}
                            </td>
                            <td>{e.name}</td>
                            <td>{e.position}</td>
                            <td>{e.dept}</td>
                            <td>{e.salary}</td>
                            <td style={{ fontSize: 12, color: "var(--muted)" }}>
                              {e.email || "—"}
                            </td>
                            <td>
                              <button
                                className="btn"
                                onClick={() => handleEditClick(e)}
                              >
                                Modifier
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(e.id)}
                                style={{ marginLeft: 8 }}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Demandes de congé</h3>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button
                        className="btn btn-primary"
                        onClick={requestLeave}
                      >
                        Demander un congé (exemple)
                      </button>
                      <button className="btn" onClick={fetchLeaves}>
                        Voir demandes
                      </button>
                    </div>
                    <div className="leave-list">
                      {leaves.map((l) => (
                        <div className="leave-item" key={l.id}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              {l.employeeId} • {l.startDate} → {l.endDate} •{" "}
                              <strong>{l.status}</strong>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {l.status === "pending" && (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => approveLeave(l.id)}
                                  >
                                    Approuver
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => rejectLeave(l.id)}
                                  >
                                    Refuser
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Admin/RH: Accès complet (employés + congés) */}
            {role === "admin" && (
              <>
                <div>
                  <div className="card">
                    <form
                      onSubmit={(e) =>
                        editingId
                          ? handleUpdateEmployee(e)
                          : handleAddEmployee(e)
                      }
                      className="form-grid"
                    >
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Nom complet"
                      />
                      <input
                        className="input"
                        value={form.position}
                        onChange={(e) =>
                          setForm({ ...form, position: e.target.value })
                        }
                        placeholder="Poste"
                      />
                      <input
                        className="input"
                        value={form.dept}
                        onChange={(e) =>
                          setForm({ ...form, dept: e.target.value })
                        }
                        placeholder="Département"
                      />
                      <input
                        className="input"
                        value={form.salary}
                        onChange={(e) =>
                          setForm({ ...form, salary: e.target.value })
                        }
                        placeholder="Salaire"
                      />
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="Email professionnel"
                      />
                      <input
                        className="file"
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            className="img-preview"
                            alt="preview"
                          />
                        ) : editingId &&
                          employees.find((x) => x.id === editingId) &&
                          employees.find((x) => x.id === editingId)
                            .profileImage ? (
                          <img
                            src={`${API.replace("/api", "")}${employees.find((x) => x.id === editingId).profileImage}`}
                            className="img-preview"
                            alt="current"
                          />
                        ) : (
                          <div
                            style={{
                              width: 96,
                              height: 96,
                              background: "#f1f5f9",
                              borderRadius: 8,
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}
                      >
                        <button className="btn btn-primary" type="submit">
                          {editingId ? "Mettre à jour" : "Enregistrer"}
                        </button>
                        {editingId ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={cancelEdit}
                          >
                            Annuler
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                  <div className="card" style={{ marginTop: 16 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Nom</th>
                          <th>Poste</th>
                          <th>Dépt</th>
                          <th>Salaire</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((e) => (
                          <tr key={e.id}>
                            <td>
                              {e.profileImage ? (
                                <img
                                  src={`${API.replace("/api", "")}${e.profileImage}`}
                                  alt="profile"
                                  style={{
                                    width: 48,
                                    height: 48,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 48,
                                    height: 48,
                                    background: "#f1f5f9",
                                    borderRadius: 8,
                                  }}
                                />
                              )}
                            </td>
                            <td>{e.name}</td>
                            <td>{e.position}</td>
                            <td>{e.dept}</td>
                            <td>{e.salary}</td>
                            <td style={{ fontSize: 12, color: "var(--muted)" }}>
                              {e.email || "—"}
                            </td>
                            <td>
                              <button
                                className="btn"
                                onClick={() => handleEditClick(e)}
                              >
                                Modifier
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(e.id)}
                                style={{ marginLeft: 8 }}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Demandes de congé</h3>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button
                        className="btn btn-primary"
                        onClick={requestLeave}
                      >
                        Demander un congé (exemple)
                      </button>
                      <button className="btn" onClick={fetchLeaves}>
                        Voir demandes
                      </button>
                    </div>
                    <div className="leave-list">
                      {leaves.map((l) => (
                        <div className="leave-item" key={l.id}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              {l.employeeId} • {l.startDate} → {l.endDate} •{" "}
                              <strong>{l.status}</strong>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {l.status === "pending" && (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => approveLeave(l.id)}
                                  >
                                    Approuver
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => rejectLeave(l.id)}
                                  >
                                    Refuser
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
      {modal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h4>{modal.title}</h4>
            <p>{modal.message}</p>
            <div className="modal-actions">
              <button className="btn" onClick={modal.onCancel}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={modal.onConfirm}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
