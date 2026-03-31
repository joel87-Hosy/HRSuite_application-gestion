import { useEffect, useState } from "react";
import "./styles.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "IntÃ©rim",
  "Consultant",
  "Apprentissage",
];

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
    birthDate: "",
    birthPlace: "",
    contractType: "",
    phone: "",
    address: "",
    gender: "",
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

  // Employee dashboard
  const [empTab, setEmpTab] = useState("home"); // home | profile | contracts | settings
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
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
      pushToast("Compte crÃ©Ã©, connectez-vous", "success");
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
      pushToast("ConnectÃ©", "success");
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
      if (role === "employee") {
        fetchNotifications();
        fetchContracts();
      }
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
        setSettingsForm({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
        });
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

  async function fetchNotifications() {
    const res = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setNotifications(await res.json());
  }

  async function fetchContracts() {
    const res = await fetch(`${API}/contracts/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setContracts(await res.json());
  }

  async function markAllNotifRead() {
    await fetch(`${API}/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((n) => n.map((x) => ({ ...x, isRead: 1 })));
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  function resetForm() {
    setForm({
      name: "",
      position: "",
      dept: "",
      salary: "",
      email: "",
      birthDate: "",
      birthPlace: "",
      contractType: "",
      phone: "",
      address: "",
      gender: "",
    });
    setFile(null);
    setPreviewUrl(null);
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") data.append(k, v);
    });
    if (file) data.append("profilePicture", file);
    const res = await fetch(`${API}/employees`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      pushToast("EmployÃ© ajoutÃ©", "success");
      resetForm();
      fetchEmployees();
    } else {
      const err = await res.json();
      pushToast("Erreur: " + (err.message || "erreur"), "error");
    }
  }

  async function handleUpdateEmployee(e) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) data.append(k, v);
    });
    if (file) data.append("profilePicture", file);
    const res = await fetch(`${API}/employees/${editingId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      pushToast("EmployÃ© mis Ã  jour", "success");
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
      salary: emp.salary !== null ? emp.salary : "",
      email: emp.email || "",
      birthDate: emp.birthDate || "",
      birthPlace: emp.birthPlace || "",
      contractType: emp.contractType || "",
      phone: emp.phone || "",
      address: emp.address || "",
      gender: emp.gender || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    setModal({
      title: "Supprimer employÃ©",
      message: "Confirmer la suppression de cet employÃ© ?",
      async onConfirm() {
        setModal(null);
        const res = await fetch(`${API}/employees/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          pushToast("EmployÃ© supprimÃ©", "success");
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
    resetForm();
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    const res = await fetch(`${API}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsForm),
    });
    if (res.ok) {
      pushToast("Profil mis Ã  jour", "success");
      fetchEmployees();
    } else pushToast("Erreur lors de la mise Ã  jour", "error");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!pwdForm.current || !pwdForm.next) {
      pushToast("Remplissez tous les champs", "error");
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      pushToast("Les mots de passe ne correspondent pas", "error");
      return;
    }
    const res = await fetch(`${API}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: pwdForm.current,
        newPassword: pwdForm.next,
      }),
    });
    if (res.ok) {
      pushToast("Mot de passe modifiÃ©", "success");
      setPwdForm({ current: "", next: "", confirm: "" });
    } else {
      const err = await res.json();
      pushToast("Erreur: " + (err.message || "erreur"), "error");
    }
  }

  // Shared employee form fields for manager/admin
  function EmployeeFormFields() {
    return (
      <>
        <div className="form-section-title">Informations gÃ©nÃ©rales</div>
        <div className="form-row-2">
          <div>
            <label className="form-label">Nom complet *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="PrÃ©nom Nom"
              required
            />
          </div>
          <div>
            <label className="form-label">Email professionnel</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@entreprise.com"
            />
          </div>
        </div>
        <div className="form-row-2">
          <div>
            <label className="form-label">Poste *</label>
            <input
              className="input"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="Ex: DÃ©veloppeur"
              required
            />
          </div>
          <div>
            <label className="form-label">DÃ©partement</label>
            <input
              className="input"
              value={form.dept}
              onChange={(e) => setForm({ ...form, dept: e.target.value })}
              placeholder="Ex: Informatique"
            />
          </div>
        </div>
        <div className="form-row-2">
          <div>
            <label className="form-label">Salaire (FCFA)</label>
            <input
              className="input"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              placeholder="Ex: 500000"
            />
          </div>
          <div>
            <label className="form-label">Type de contrat</label>
            <select
              className="input"
              value={form.contractType}
              onChange={(e) =>
                setForm({ ...form, contractType: e.target.value })
              }
            >
              <option value="">â€” SÃ©lectionner â€”</option>
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-section-title" style={{ marginTop: 16 }}>
          Informations personnelles
        </div>
        <div className="form-row-2">
          <div>
            <label className="form-label">Sexe</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">â€” SÃ©lectionner â€”</option>
              <option value="Masculin">Masculin</option>
              <option value="FÃ©minin">FÃ©minin</option>
            </select>
          </div>
          <div>
            <label className="form-label">TÃ©lÃ©phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ex: +225 07 07 07 07"
            />
          </div>
        </div>
        <div className="form-row-2">
          <div>
            <label className="form-label">Date de naissance</label>
            <input
              className="input"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Lieu de naissance</label>
            <input
              className="input"
              value={form.birthPlace}
              onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
              placeholder="Ex: Abidjan"
            />
          </div>
        </div>
        <div>
          <label className="form-label">Lieu d&apos;habitation</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Ex: Cocody, Abidjan"
          />
        </div>
        <div className="form-section-title" style={{ marginTop: 16 }}>
          Photo de profil
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            className="file"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files[0];
              setFile(f);
              if (f) setPreviewUrl(URL.createObjectURL(f));
            }}
          />
          {previewUrl ? (
            <img src={previewUrl} className="img-preview" alt="preview" />
          ) : editingId &&
            employees.find((x) => x.id === editingId)?.profileImage ? (
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
          style={{ gridColumn: "1/-1", display: "flex", gap: 8, marginTop: 8 }}
        >
          <button className="btn btn-primary" type="submit">
            {editingId ? "Mettre Ã  jour" : "Enregistrer"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={cancelEdit}>
              Annuler
            </button>
          )}
        </div>
      </>
    );
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
        "Aucune fiche employÃ© liÃ©e Ã  votre compte. Contactez le RH.",
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
      pushToast("Demande de congÃ© envoyÃ©e", "success");
    } else {
      pushToast("Erreur lors de la demande de congÃ©", "error");
    }
  }

  async function approveLeave(id) {
    const res = await fetch(`${API}/leaves/${id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      pushToast("Demande approuvÃ©e", "success");
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
      pushToast("Demande rejetÃ©e", "success");
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
            <h2 className="auth-title">CrÃ©er un compte</h2>
            <p className="auth-subtitle">Rejoignez votre Ã©quipe RH</p>
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                {registerLoading
                  ? "CrÃ©ation en cours..."
                  : "CrÃ©er mon compte"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setShowRegister(false)}
              >
                DÃ©jÃ  un compte ? <strong>Se connecter</strong>
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
          <h2 className="auth-title">Bienvenue ðŸ‘‹</h2>
          <p className="auth-subtitle">Connectez-vous Ã  votre espace RH</p>
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
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Afficher/masquer le mot de passe"
                >
                  {showPassword ? "ðŸ™ˆ" : "ðŸ‘ï¸"}
                </button>
              </div>
            </div>
            <div className="auth-forgot">
              <button
                type="button"
                className="auth-link-sm"
                onClick={async () => {
                  const email = window.prompt(
                    "Entrez votre email pour rÃ©initialiser le mot de passe",
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
                      pushToast(
                        "Mot de passe rÃ©initialisÃ©.",
                        "success",
                        8000,
                      );
                      setTimeout(
                        () =>
                          alert(
                            "Mot de passe temporaire: " +
                              (data.tempPassword || "â€”"),
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
                    pushToast("Erreur rÃ©seau", "error");
                  }
                }}
              >
                Mot de passe oubliÃ© ?
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
              Pas encore de compte ? <strong>CrÃ©er un compte</strong>
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

  // â”€â”€ Main app â”€â”€
  return (
    <div className="app">
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <div className="brand">HRSuite</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {role === "employee" && (
            <button
              className="notif-btn"
              onClick={() => {
                setNotifOpen((o) => !o);
                if (!notifOpen) fetchNotifications();
              }}
              aria-label="Notifications"
            >
              ðŸ””
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
            </button>
          )}
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
      </div>
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <div className="brand">HRSuite</div>
        <div className="user">ConnectÃ©: {name || "utilisateur"}</div>
        {role === "employee" && (
          <nav className="emp-nav">
            {[
              { id: "home", label: "ðŸ  Accueil" },
              { id: "profile", label: "ðŸ‘¤ Mon Profil" },
              { id: "contracts", label: "ðŸ“„ Mes Contrats" },
              { id: "settings", label: "âš™ï¸ ParamÃ¨tres" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`emp-nav-btn${empTab === tab.id ? " active" : ""}`}
                onClick={() => {
                  setEmpTab(tab.id);
                  setMenuOpen(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}
        <div className="side-actions">
          {role === "employee" && (
            <button
              className="notif-sidebar-btn"
              onClick={() => {
                setNotifOpen((o) => !o);
                fetchNotifications();
                setMenuOpen(false);
              }}
            >
              ðŸ”” Notifications{" "}
              {unreadCount > 0 && (
                <span className="notif-badge-inline">{unreadCount}</span>
              )}
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              fetchEmployees();
              fetchLeaves();
              setMenuOpen(false);
            }}
          >
            RafraÃ®chir
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setToken(null);
              setRole(null);
              setMenuOpen(false);
            }}
          >
            DÃ©connexion
          </button>
        </div>
      </aside>
      {/* Notification panel */}
      {notifOpen && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            <div style={{ display: "flex", gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: "2px 8px" }}
                  onClick={markAllNotifRead}
                >
                  Tout lire
                </button>
              )}
              <button
                className="btn"
                style={{ fontSize: 12, padding: "2px 8px" }}
                onClick={() => setNotifOpen(false)}
              >
                âœ•
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">Aucune notification</div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item${n.isRead ? "" : " unread"}`}
                >
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-date">
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleDateString("fr-FR")
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <main className="main">
        <div className="container">
          <div className="header">
            <div className="title">
              {role === "employee" &&
                (empTab === "home"
                  ? "Tableau de bord"
                  : empTab === "profile"
                    ? "Mon Profil"
                    : empTab === "contracts"
                      ? "Mes Contrats"
                      : "ParamÃ¨tres")}
              {role === "manager" && "Gestion du Personnel"}
              {role === "admin" && "Administration RH"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {role === "employee" && (
                <button
                  className="notif-btn"
                  style={{ display: "none" }}
                  onClick={() => {
                    setNotifOpen((o) => !o);
                    fetchNotifications();
                  }}
                >
                  ðŸ””
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount}</span>
                  )}
                </button>
              )}
              <div style={{ color: "var(--muted)" }}>SystÃ¨me RH</div>
            </div>
          </div>

          {/* â•â•â•â• EMPLOYEE DASHBOARD â•â•â•â• */}
          {role === "employee" && (
            <>
              {/* Desktop tab bar */}
              <div className="emp-tab-bar">
                {[
                  { id: "home", label: "ðŸ  Accueil" },
                  { id: "profile", label: "ðŸ‘¤ Mon Profil" },
                  { id: "contracts", label: "ðŸ“„ Mes Contrats" },
                  { id: "settings", label: "âš™ï¸ ParamÃ¨tres" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`emp-tab-btn${empTab === tab.id ? " active" : ""}`}
                    onClick={() => setEmpTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* â”€â”€ HOME TAB â”€â”€ */}
              {empTab === "home" && (
                <div className="emp-home">
                  <div className="emp-stats-row">
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">ðŸ–ï¸</div>
                      <div className="emp-stat-value">52</div>
                      <div className="emp-stat-label">
                        Jours congÃ© autorisÃ©s
                      </div>
                    </div>
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">ðŸ“‹</div>
                      <div className="emp-stat-value">10</div>
                      <div className="emp-stat-label">
                        Permissions autorisÃ©es
                      </div>
                    </div>
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">âœ…</div>
                      <div className="emp-stat-value">
                        {leaves.filter((l) => l.status === "approved").length}
                      </div>
                      <div className="emp-stat-label">Demandes approuvÃ©es</div>
                    </div>
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">â³</div>
                      <div className="emp-stat-value">
                        {leaves.filter((l) => l.status === "pending").length}
                      </div>
                      <div className="emp-stat-label">En attente</div>
                    </div>
                  </div>
                  {!employeeRecord && (
                    <div
                      className="profile-not-linked"
                      style={{ marginTop: 16 }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8 }}>âš ï¸</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Fiche non liÃ©e
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 14 }}>
                        Votre compte n&apos;est pas encore liÃ© Ã  une fiche
                        employÃ©.
                        <br />
                        Contactez le service RH en leur donnant votre adresse
                        email.
                      </div>
                    </div>
                  )}
                  <div className="grid-2" style={{ marginTop: 16 }}>
                    <div className="card">
                      <h3 style={{ marginTop: 0 }}>
                        Demande de congÃ© / permission
                      </h3>
                      {!employeeRecord && (
                        <div
                          style={{
                            color: "var(--danger)",
                            fontSize: 14,
                            marginBottom: 10,
                          }}
                        >
                          Votre fiche employÃ© doit Ãªtre liÃ©e pour soumettre
                          une demande.
                        </div>
                      )}
                      <form onSubmit={requestLeave} className="leave-form">
                        <div className="leave-form-row">
                          <div>
                            <label className="form-label">Date de dÃ©but</label>
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
                            placeholder="Ex: CongÃ©s annuels, Permission..."
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
                    </div>
                    <div className="card">
                      <h4 style={{ marginTop: 0 }}>
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
                              {l.startDate} â†’ {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            <div className="leave-item-reason">{l.reason}</div>
                            <div
                              className={`leave-status leave-status-${l.status}`}
                            >
                              {l.status === "pending" && "â³ En attente"}
                              {l.status === "approved" && "âœ… ApprouvÃ©"}
                              {l.status === "rejected" && "âŒ RefusÃ©"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* â”€â”€ PROFILE TAB â”€â”€ */}
              {empTab === "profile" && (
                <div className="card" style={{ marginTop: 16 }}>
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
                          {[
                            ["DÃ©partement", employeeRecord.dept],
                            ["Statut", employeeRecord.status || "Actif"],
                            [
                              "Salaire",
                              employeeRecord.salary != null &&
                              employeeRecord.salary !== ""
                                ? `${Number(employeeRecord.salary).toLocaleString("fr-FR")} FCFA`
                                : null,
                            ],
                            ["Type de contrat", employeeRecord.contractType],
                            ["Sexe", employeeRecord.gender],
                            ["TÃ©lÃ©phone", employeeRecord.phone],
                            ["Date de naissance", employeeRecord.birthDate],
                            ["Lieu de naissance", employeeRecord.birthPlace],
                            ["Lieu d'habitation", employeeRecord.address],
                            ["Email", employeeRecord.email],
                          ].map(([label, value]) =>
                            value ? (
                              <div className="profile-field" key={label}>
                                <span className="profile-field-label">
                                  {label}
                                </span>
                                <span
                                  className={`profile-field-value${label === "Statut" ? " profile-status" : ""}`}
                                >
                                  {value}
                                </span>
                              </div>
                            ) : null,
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="profile-not-linked">
                      <div style={{ fontSize: 36, marginBottom: 8 }}>âš ï¸</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Fiche non liÃ©e
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 14 }}>
                        Contactez le service RH en leur donnant votre adresse
                        email.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ CONTRACTS TAB â”€â”€ */}
              {empTab === "contracts" && (
                <div style={{ marginTop: 16 }}>
                  {contracts.length === 0 ? (
                    <div className="card">
                      <div
                        style={{
                          color: "var(--muted)",
                          textAlign: "center",
                          padding: 24,
                        }}
                      >
                        Aucun contrat enregistrÃ© pour votre compte.
                      </div>
                    </div>
                  ) : (
                    <>
                      {contracts
                        .filter((c) => c.isActive)
                        .map((c) => (
                          <div
                            className="card contract-card contract-active"
                            key={c.id}
                          >
                            <div className="contract-badge">
                              Contrat actif âœ…
                            </div>
                            <div className="contract-type">{c.type}</div>
                            <div className="contract-dates">
                              <span>DÃ©but : {c.startDate || "â€”"}</span>
                              {c.endDate && <span>Fin : {c.endDate}</span>}
                            </div>
                            {c.notes && (
                              <div className="contract-notes">{c.notes}</div>
                            )}
                          </div>
                        ))}
                      {contracts.filter((c) => !c.isActive).length > 0 && (
                        <>
                          <h4
                            style={{
                              marginTop: 16,
                              marginBottom: 8,
                              color: "var(--muted)",
                            }}
                          >
                            Contrats prÃ©cÃ©dents
                          </h4>
                          {contracts
                            .filter((c) => !c.isActive)
                            .map((c) => (
                              <div className="card contract-card" key={c.id}>
                                <div className="contract-type">{c.type}</div>
                                <div className="contract-dates">
                                  <span>DÃ©but : {c.startDate || "â€”"}</span>
                                  {c.endDate && <span>Fin : {c.endDate}</span>}
                                </div>
                                {c.notes && (
                                  <div className="contract-notes">
                                    {c.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* â”€â”€ SETTINGS TAB â”€â”€ */}
              {empTab === "settings" && (
                <div className="grid-2" style={{ marginTop: 16 }}>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Informations personnelles</h3>
                    <form
                      onSubmit={handleSaveSettings}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div>
                        <label className="form-label">Nom complet</label>
                        <input
                          className="input"
                          value={settingsForm.name}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label">TÃ©lÃ©phone</label>
                        <input
                          className="input"
                          value={settingsForm.phone}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              phone: e.target.value,
                            })
                          }
                          placeholder="+225 07 07 07 07"
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          Lieu d&apos;habitation
                        </label>
                        <input
                          className="input"
                          value={settingsForm.address}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="Cocody, Abidjan"
                        />
                      </div>
                      <button className="btn btn-primary" type="submit">
                        Enregistrer les modifications
                      </button>
                    </form>
                  </div>
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Changer le mot de passe</h3>
                    <form
                      onSubmit={handleChangePassword}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div>
                        <label className="form-label">
                          Mot de passe actuel
                        </label>
                        <input
                          className="input"
                          type="password"
                          value={pwdForm.current}
                          onChange={(e) =>
                            setPwdForm({ ...pwdForm, current: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          Nouveau mot de passe
                        </label>
                        <input
                          className="input"
                          type="password"
                          value={pwdForm.next}
                          onChange={(e) =>
                            setPwdForm({ ...pwdForm, next: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          Confirmer le nouveau mot de passe
                        </label>
                        <input
                          className="input"
                          type="password"
                          value={pwdForm.confirm}
                          onChange={(e) =>
                            setPwdForm({ ...pwdForm, confirm: e.target.value })
                          }
                        />
                      </div>
                      <button className="btn btn-primary" type="submit">
                        Modifier le mot de passe
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* â•â•â•â• MANAGER VIEW â•â•â•â• */}
          {role === "manager" && (
            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>
                    {editingId ? "Modifier l'employÃ©" : "Ajouter un employÃ©"}
                  </h3>
                  <form
                    onSubmit={(e) =>
                      editingId ? handleUpdateEmployee(e) : handleAddEmployee(e)
                    }
                    className="emp-form"
                  >
                    <EmployeeFormFields />
                  </form>
                </div>
                <div className="card" style={{ marginTop: 16 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Nom</th>
                        <th>Poste</th>
                        <th>DÃ©pt</th>
                        <th>Contrat</th>
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
                                alt="p"
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
                          <td>
                            <span className="contract-tag">
                              {e.contractType || "â€”"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--muted)" }}>
                            {e.email || "â€”"}
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
                  <h3 style={{ marginTop: 0 }}>Demandes de congÃ©</h3>
                  <div className="leave-list">
                    {leaves.length === 0 && (
                      <div style={{ color: "var(--muted)", fontSize: 14 }}>
                        Aucune demande.
                      </div>
                    )}
                    {leaves.map((l) => (
                      <div className="leave-item" key={l.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <div className="leave-item-dates">
                              {l.startDate} â†’ {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            <div className="leave-item-reason">
                              {l.reason} â€” Emp. #{l.employeeId}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {l.status === "pending" && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: 12 }}
                                  onClick={() => approveLeave(l.id)}
                                >
                                  Approuver
                                </button>
                                <button
                                  className="btn"
                                  style={{ fontSize: 12 }}
                                  onClick={() => rejectLeave(l.id)}
                                >
                                  Refuser
                                </button>
                              </>
                            )}
                            {l.status !== "pending" && (
                              <span
                                className={`leave-status leave-status-${l.status}`}
                              >
                                {l.status === "approved"
                                  ? "âœ… ApprouvÃ©"
                                  : "âŒ RefusÃ©"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â•â•â•â• ADMIN VIEW â•â•â•â• */}
          {role === "admin" && (
            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>
                    {editingId ? "Modifier l'employÃ©" : "Ajouter un employÃ©"}
                  </h3>
                  <form
                    onSubmit={(e) =>
                      editingId ? handleUpdateEmployee(e) : handleAddEmployee(e)
                    }
                    className="emp-form"
                  >
                    <EmployeeFormFields />
                  </form>
                </div>
                <div className="card" style={{ marginTop: 16 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Nom</th>
                        <th>Poste</th>
                        <th>DÃ©pt</th>
                        <th>Contrat</th>
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
                                alt="p"
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
                          <td>
                            <span className="contract-tag">
                              {e.contractType || "â€”"}
                            </span>
                          </td>
                          <td>
                            {e.salary != null && e.salary !== ""
                              ? Number(e.salary).toLocaleString("fr-FR")
                              : "â€”"}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--muted)" }}>
                            {e.email || "â€”"}
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
                  <h3 style={{ marginTop: 0 }}>Demandes de congÃ©</h3>
                  <div className="leave-list">
                    {leaves.length === 0 && (
                      <div style={{ color: "var(--muted)", fontSize: 14 }}>
                        Aucune demande.
                      </div>
                    )}
                    {leaves.map((l) => (
                      <div className="leave-item" key={l.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <div className="leave-item-dates">
                              {l.startDate} â†’ {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            <div className="leave-item-reason">
                              {l.reason} â€” Emp. #{l.employeeId}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {l.status === "pending" && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: 12 }}
                                  onClick={() => approveLeave(l.id)}
                                >
                                  Approuver
                                </button>
                                <button
                                  className="btn"
                                  style={{ fontSize: 12 }}
                                  onClick={() => rejectLeave(l.id)}
                                >
                                  Refuser
                                </button>
                              </>
                            )}
                            {l.status !== "pending" && (
                              <span
                                className={`leave-status leave-status-${l.status}`}
                              >
                                {l.status === "approved"
                                  ? "âœ… ApprouvÃ©"
                                  : "âŒ RefusÃ©"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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
