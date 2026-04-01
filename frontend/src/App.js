import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./styles.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Intérim",
  "Consultant",
  "Apprentissage",
];

const LEAVE_TYPES = [
  "Congé annuel",
  "Congé maladie",
  "Congé de maternité",
  "Congé de paternité",
  "Congé sans solde",
  "Permission exceptionnelle",
  "Récupération",
  "Formation",
];

// Top-level component so React doesn't remount it on every App re-render
function EmployeeFormFields({
  form,
  setForm,
  file,
  setFile,
  previewUrl,
  setPreviewUrl,
  editingId,
  employees,
  cancelEdit,
}) {
  return (
    <>
      <div className="form-section-title">Informations générales</div>
      <div className="form-row-2">
        <div>
          <label className="form-label">Nom complet *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Prénom Nom"
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
            placeholder="Ex: Développeur"
            required
          />
        </div>
        <div>
          <label className="form-label">Département</label>
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
            onChange={(e) => setForm({ ...form, contractType: e.target.value })}
          >
            <option value="">— Sélectionner —</option>
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
            <option value="">— Sélectionner —</option>
            <option value="Masculin">Masculin</option>
            <option value="Féminin">Féminin</option>
          </select>
        </div>
        <div>
          <label className="form-label">Téléphone</label>
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
        <label className="form-label">Lieu d'habitation</label>
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
          {editingId ? "Mettre à jour" : "Enregistrer"}
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
    leaveType: "",
    interimName: "",
    interimFunction: "",
    interimEmployeeId: "",
  });
  const [allEmployees, setAllEmployees] = useState([]);

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
  const [leaveAvailable, setLeaveAvailable] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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

  // WebSocket real-time sync
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("employeeAdded", (employee) => {
      console.log("New employee added:", employee);
      setEmployees((prev) => [...prev, employee]);
    });

    socket.on("employeeUpdated", (employee) => {
      console.log("Employee updated:", employee);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === employee.id ? employee : emp))
      );
      if (employeeRecord && employeeRecord.id === employee.id) {
        setEmployeeRecord(employee);
      }
    });

    socket.on("employeeDeleted", (data) => {
      console.log("Employee deleted:", data.id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== data.id));
    });

    socket.on("leaveStatusChanged", (data) => {
      console.log("Leave status changed:", data);
      fetchLeaveAvailable();
      fetchLeaves();
    });

    return () => socket.disconnect();
  }, []);

  // Load data after login
  useEffect(() => {
    if (token && role) {
      fetchEmployees();
      fetchLeaves();
      if (role === "employee") {
        fetchNotifications();
        fetchContracts();
        fetchAllEmployees();
        fetchLeaveAvailable();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // Auto-refresh employees on all devices (every 30 seconds for RH, 60 for employees)
  useEffect(() => {
    if (!token || !role) return;

    const interval = setInterval(() => {
      fetchEmployees();
      if (role === "employee") {
        fetchAllEmployees();
      }
    }, role === "rh" || role === "admin" ? 30000 : 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  async function fetchEmployees() {
    if (!token) return;
    if (role === "employee") {
      const res = await fetch(`${API}/employees/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (res.ok) setEmployees(await res.json());
    }
  }

  async function fetchNotifications() {
    const res = await fetch(`${API}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });
    if (res.ok) setNotifications(await res.json());
  }

  async function fetchContracts() {
    const res = await fetch(`${API}/contracts/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });
    if (res.ok) setContracts(await res.json());
  }

  async function fetchLeaveAvailable() {
    if (!token) return;
    const res = await fetch(`${API}/leaves/available`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });
    if (res.ok) {
      const data = await res.json();
      setLeaveAvailable(data);
    }
  }

  async function fetchAllEmployees() {
    const res = await fetch(`${API}/employees`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });
    if (res.ok) setAllEmployees(await res.json());
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
      pushToast("Employé ajouté", "success");
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
      pushToast("Profil mis à jour", "success");
      fetchEmployees();
    } else pushToast("Erreur lors de la mise à jour", "error");
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
      pushToast("Mot de passe modifié", "success");
      setPwdForm({ current: "", next: "", confirm: "" });
    } else {
      const err = await res.json();
      pushToast("Erreur: " + (err.message || "erreur"), "error");
    }
  }

  async function fetchLeaves() {
    if (!token) return;
    const endpoint = role === "employee" ? `${API}/leaves/my` : `${API}/leaves`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
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
      leaveType: leaveForm.leaveType || null,
      interimName: leaveForm.interimName || null,
      interimFunction: leaveForm.interimFunction || null,
      interimEmployeeId: leaveForm.interimEmployeeId || null,
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
      setLeaveForm({
        startDate: "",
        endDate: "",
        reason: "",
        leaveType: "",
        interimName: "",
        interimFunction: "",
        interimEmployeeId: "",
      });
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

  // ── Main app ──
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
              🔔
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
        <div className="user">Connecté: {name || "utilisateur"}</div>
        {role === "employee" && (
          <nav className="emp-nav">
            {[
              { id: "home", label: "🏠 Accueil" },
              { id: "profile", label: "👤 Mon Profil" },
              { id: "contracts", label: "📄 Mes Contrats" },
              { id: "settings", label: "⚙️ Paramètres" },
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
              🔔 Notifications{" "}
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
                ✕
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
                      : "Paramètres")}
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
                  🔔
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount}</span>
                  )}
                </button>
              )}
              <div style={{ color: "var(--muted)" }}>Système RH</div>
            </div>
          </div>

          {/* ════ EMPLOYEE DASHBOARD ════ */}
          {role === "employee" && (
            <>
              {/* Desktop tab bar */}
              <div className="emp-tab-bar">
                {[
                  { id: "home", label: "🏠 Accueil" },
                  { id: "profile", label: "👤 Mon Profil" },
                  { id: "contracts", label: "📄 Mes Contrats" },
                  { id: "settings", label: "⚙️ Paramètres" },
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

              {/* ── HOME TAB ── */}
              {empTab === "home" && (
                <div className="emp-home">
                  <div className="emp-stats-row">
                    <div
                      className="emp-stat-card"
                      onClick={() => {
                        fetchLeaveAvailable();
                        setShowLeaveModal(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="emp-stat-icon">🏖️</div>
                      <div className="emp-stat-value">
                        {leaveAvailable?.annualLeaveAvailable || 22}
                      </div>
                      <div className="emp-stat-label">
                        Jours congé disponibles
                      </div>
                    </div>
                    <div
                      className="emp-stat-card"
                      onClick={() => {
                        fetchLeaveAvailable();
                        setShowLeaveModal(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="emp-stat-icon">📋</div>
                      <div className="emp-stat-value">
                        {leaveAvailable?.permissionDaysAvailable || 5}
                      </div>
                      <div className="emp-stat-label">
                        Permissions disponibles
                      </div>
                    </div>
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">✅</div>
                      <div className="emp-stat-value">
                        {leaves.filter((l) => l.status === "approved").length}
                      </div>
                      <div className="emp-stat-label">Demandes approuvées</div>
                    </div>
                    <div className="emp-stat-card">
                      <div className="emp-stat-icon">⏳</div>
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
                  <div className="grid-2" style={{ marginTop: 16 }}>
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
                        {/* Type de congé */}
                        <div>
                          <label className="form-label">
                            Type de congé / permission *
                          </label>
                          <select
                            className="input"
                            value={leaveForm.leaveType}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                leaveType: e.target.value,
                              })
                            }
                            required
                          >
                            <option value="">— Sélectionner —</option>
                            {LEAVE_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Dates */}
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
                        {/* Motif */}
                        <div>
                          <label className="form-label">
                            Motif / précisions
                          </label>
                          <input
                            className="input"
                            value={leaveForm.reason}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                reason: e.target.value,
                              })
                            }
                            placeholder="Ex: Congés annuels, visite médicale..."
                            required
                          />
                        </div>
                        {/* Intérimaire */}
                        <div className="form-section-title leave-interim-title">
                          🔄 Intérimaire (optionnel)
                        </div>
                        <div>
                          <label className="form-label">
                            Sélectionner un intérimaire dans la liste
                          </label>
                          <select
                            className="input"
                            value={leaveForm.interimEmployeeId}
                            onChange={(e) => {
                              const chosen = allEmployees.find(
                                (x) => String(x.id) === e.target.value,
                              );
                              setLeaveForm({
                                ...leaveForm,
                                interimEmployeeId: e.target.value,
                                interimName: chosen
                                  ? chosen.name
                                  : leaveForm.interimName,
                                interimFunction: chosen
                                  ? chosen.position || ""
                                  : leaveForm.interimFunction,
                              });
                            }}
                          >
                            <option value="">
                              — Choisir parmi les employés —
                            </option>
                            {allEmployees
                              .filter((x) => x.id !== employeeRecord?.id)
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                  {x.position ? ` — ${x.position}` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="leave-form-row">
                          <div>
                            <label className="form-label">
                              Nom de l&apos;intérimaire
                            </label>
                            <input
                              className="input"
                              value={leaveForm.interimName}
                              onChange={(e) =>
                                setLeaveForm({
                                  ...leaveForm,
                                  interimName: e.target.value,
                                  interimEmployeeId: "",
                                })
                              }
                              placeholder="Prénom Nom"
                            />
                          </div>
                          <div>
                            <label className="form-label">
                              Fonction de l&apos;intérimaire
                            </label>
                            <input
                              className="input"
                              value={leaveForm.interimFunction}
                              onChange={(e) =>
                                setLeaveForm({
                                  ...leaveForm,
                                  interimFunction: e.target.value,
                                  interimEmployeeId: "",
                                })
                              }
                              placeholder="Ex: Développeur, Comptable..."
                            />
                          </div>
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
                              {l.startDate} → {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            {l.leaveType && (
                              <span className="leave-type-badge">
                                {l.leaveType}
                              </span>
                            )}
                            <div className="leave-item-reason">{l.reason}</div>
                            {(l.interimName || l.interimFunction) && (
                              <div className="leave-item-interim">
                                🔄 Intérimaire :{" "}
                                <strong>{l.interimName}</strong>
                                {l.interimFunction
                                  ? ` — ${l.interimFunction}`
                                  : ""}
                              </div>
                            )}
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
                </div>
              )}

              {/* ── PROFILE TAB ── */}
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
                            ["Département", employeeRecord.dept],
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
                            ["Téléphone", employeeRecord.phone],
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
                      <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Fiche non liée
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 14 }}>
                        Contactez le service RH en leur donnant votre adresse
                        email.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CONTRACTS TAB ── */}
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
                        Aucun contrat enregistré pour votre compte.
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
                              Contrat actif ✅
                            </div>
                            <div className="contract-type">{c.type}</div>
                            <div className="contract-dates">
                              <span>Début : {c.startDate || "—"}</span>
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
                            Contrats précédents
                          </h4>
                          {contracts
                            .filter((c) => !c.isActive)
                            .map((c) => (
                              <div className="card contract-card" key={c.id}>
                                <div className="contract-type">{c.type}</div>
                                <div className="contract-dates">
                                  <span>Début : {c.startDate || "—"}</span>
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

              {/* ── SETTINGS TAB ── */}
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
                        <label className="form-label">Téléphone</label>
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

          {/* ════ MANAGER VIEW ════ */}
          {role === "manager" && (
            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>
                    {editingId ? "Modifier l'employé" : "Ajouter un employé"}
                  </h3>
                  <form
                    onSubmit={(e) =>
                      editingId ? handleUpdateEmployee(e) : handleAddEmployee(e)
                    }
                    className="emp-form"
                  >
                    <EmployeeFormFields
                      form={form}
                      setForm={setForm}
                      file={file}
                      setFile={setFile}
                      previewUrl={previewUrl}
                      setPreviewUrl={setPreviewUrl}
                      editingId={editingId}
                      employees={employees}
                      cancelEdit={cancelEdit}
                    />
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
                              {e.contractType || "—"}
                            </span>
                          </td>
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
                              {l.startDate} → {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            {l.leaveType && (
                              <span className="leave-type-badge">
                                {l.leaveType}
                              </span>
                            )}
                            <div className="leave-item-reason">
                              {l.reason} — Emp. #{l.employeeId}
                            </div>
                            {(l.interimName || l.interimFunction) && (
                              <div className="leave-item-interim">
                                🔄 Intérimaire :{" "}
                                <strong>{l.interimName}</strong>
                                {l.interimFunction
                                  ? ` — ${l.interimFunction}`
                                  : ""}
                              </div>
                            )}
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
                                  ? "✅ Approuvé"
                                  : "❌ Refusé"}
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

          {/* ════ ADMIN VIEW ════ */}
          {role === "admin" && (
            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>
                    {editingId ? "Modifier l'employé" : "Ajouter un employé"}
                  </h3>
                  <form
                    onSubmit={(e) =>
                      editingId ? handleUpdateEmployee(e) : handleAddEmployee(e)
                    }
                    className="emp-form"
                  >
                    <EmployeeFormFields
                      form={form}
                      setForm={setForm}
                      file={file}
                      setFile={setFile}
                      previewUrl={previewUrl}
                      setPreviewUrl={setPreviewUrl}
                      editingId={editingId}
                      employees={employees}
                      cancelEdit={cancelEdit}
                    />
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
                              {e.contractType || "—"}
                            </span>
                          </td>
                          <td>
                            {e.salary != null && e.salary !== ""
                              ? Number(e.salary).toLocaleString("fr-FR")
                              : "—"}
                          </td>
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
                              {l.startDate} → {l.endDate}{" "}
                              <span className="leave-days">({l.days}j)</span>
                            </div>
                            {l.leaveType && (
                              <span className="leave-type-badge">
                                {l.leaveType}
                              </span>
                            )}
                            <div className="leave-item-reason">
                              {l.reason} — Emp. #{l.employeeId}
                            </div>
                            {(l.interimName || l.interimFunction) && (
                              <div className="leave-item-interim">
                                🔄 Intérimaire :{" "}
                                <strong>{l.interimName}</strong>
                                {l.interimFunction
                                  ? ` — ${l.interimFunction}`
                                  : ""}
                              </div>
                            )}
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
                                  ? "✅ Approuvé"
                                  : "❌ Refusé"}
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

      {/* Leave Available Modal */}
      {showLeaveModal && leaveAvailable && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Détail de vos jours disponibles</h2>
              <button
                className="modal-close"
                onClick={() => setShowLeaveModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0, color: "var(--primary)" }}>
                  🏖️ Congés annuels
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Autorisés
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {leaveAvailable.annualLeaveAllowed}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Utilisés
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--warning)" }}>
                      {leaveAvailable.annualLeaveUsed}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Disponibles
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--success)" }}>
                      {leaveAvailable.annualLeaveAvailable}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ marginTop: 0, color: "var(--primary)" }}>
                  📋 Permissions exceptionnelles
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Autorisées
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>
                      {leaveAvailable.permissionDaysAllowed}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Utilisées
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--warning)" }}>
                      {leaveAvailable.permissionDaysUsed}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--bg-hover)",
                      borderRadius: 6,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Disponibles
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--success)" }}>
                      {leaveAvailable.permissionDaysAvailable}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowLeaveModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
