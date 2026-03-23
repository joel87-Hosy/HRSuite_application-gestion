import { useEffect, useState } from "react";
import "./styles.css";

const API = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    name: "",
    position: "",
    dept: "",
    salary: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function pushToast(message, type = "info", ttl = 3500) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (token) fetchEmployees();
  }, [token]);

  async function fetchEmployees() {
    const res = await fetch(`${API}/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setEmployees(await res.json());
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!login.email || !login.password) {
      pushToast("Veuillez fournir email et mot de passe", "error");
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
      setRole(data.role || "employee");
      setName(data.name || "");
      pushToast("Connexion réussie", "success");
    } else {
      pushToast("Échec de la connexion — vérifiez vos identifiants", "error");
    }
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    if (!form.name || !form.position) {
      pushToast("Nom et poste sont requis", "error");
      return;
    }
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("position", form.position);
    fd.append("dept", form.dept);
    fd.append("salary", form.salary || 0);
    if (file) fd.append("profilePicture", file);
    const res = await fetch(`${API}/employees`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      setForm({ name: "", position: "", dept: "", salary: "" });
      setFile(null);
      fetchEmployees();
      pushToast("Employé ajouté", "success");
    } else {
      const err = await res.json();
      pushToast("Erreur ajout employé: " + (err.message || "erreur"), "error");
    }
  }

  async function handleUpdateEmployee(e) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.name || !form.position) {
      pushToast("Nom et poste sont requis", "error");
      return;
    }
    try {
      // Send multipart/form-data so we can update fields + file in one request
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("position", form.position);
      fd.append("dept", form.dept || "");
      fd.append("salary", form.salary || 0);
      if (file) fd.append("profilePicture", file);
      const res = await fetch(`${API}/employees/${editingId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        pushToast("Employé mis à jour", "success");
        setEditingId(null);
        setForm({ name: "", position: "", dept: "", salary: "" });
        setFile(null);
        fetchEmployees();
      } else {
        const err = await res.json();
        pushToast("Erreur mise à jour: " + (err.message || "erreur"), "error");
      }
    } catch (err) {
      pushToast("Erreur mise à jour: " + (err.message || "erreur"), "error");
    }
  }

  function handleEditClick(emp) {
    setEditingId(emp.id);
    setForm({
      name: emp.name || "",
      position: emp.position || "",
      dept: emp.dept || "",
      salary: emp.salary || 0,
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
    setForm({ name: "", position: "", dept: "", salary: "" });
    setFile(null);
  }

  async function fetchLeaves() {
    const res = await fetch(`${API}/leaves`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeaves(await res.json());
  }

  async function requestLeave(e) {
    e.preventDefault();
    const body = {
      employeeId: 1,
      startDate: "2026-04-01",
      endDate: "2026-04-03",
      days: 3,
      reason: "Vacances",
    };
    const res = await fetch(`${API}/leaves`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) fetchLeaves();
    if (res.ok) pushToast("Demande de congé envoyée", "success");
    else pushToast("Erreur lors de la demande de congé", "error");
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
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
        }}
      >
        <div className="card" style={{ width: 420 }}>
          <h2
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Connexion HRSuite
          </h2>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
            <input
              className="input"
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
              type="email"
              placeholder="Email"
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input"
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="toggle password"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button className="btn btn-primary" type="submit">
                Se connecter
              </button>
              <button
                type="button"
                className="btn btn-link"
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
                      // show temporary password (prototype)
                      pushToast(
                        "Mot de passe réinitialisé. Vérifiez le toast pour le mot de passe temporaire.",
                        "success",
                        8000,
                      );
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
                        "Erreur réinitialisation: " + (err.message || "erreur"),
                        "error",
                      );
                    }
                  } catch (e) {
                    pushToast(
                      "Erreur réseau lors de la réinitialisation",
                      "error",
                    );
                  }
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <button className="btn btn-primary" type="submit">
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">HRSuite</div>
        <div className="user">Connecté: {name || "utilisateur"}</div>
        <div className="side-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              fetchEmployees();
              fetchLeaves();
            }}
          >
            Rafraîchir
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setToken(null);
              setRole(null);
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="container">
          <div className="header">
            <div className="title">Liste du Personnel</div>
            <div style={{ color: "var(--muted)" }}>Système RH • Prototype</div>
          </div>

          <div className="grid-2" style={{ marginTop: 18 }}>
            <div>
              <div className="card">
                <form
                  onSubmit={(e) =>
                    editingId ? handleUpdateEmployee(e) : handleAddEmployee(e)
                  }
                  className="form-grid"
                >
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, dept: e.target.value })}
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
                    className="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        className="img-preview"
                        alt="preview"
                      />
                    ) : editingId &&
                      employees.find((x) => x.id === editingId) &&
                      employees.find((x) => x.id === editingId).profileImage ? (
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
                  <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
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
                  <button className="btn btn-primary" onClick={requestLeave}>
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
                          {["manager", "rh", "admin"].includes(role) &&
                          l.status === "pending" ? (
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
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
