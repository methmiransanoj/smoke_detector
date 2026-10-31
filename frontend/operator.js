
const API = "/api/operators";
const $ = id => document.getElementById(id);

// Load and display operators
async function fetchOperators() {
    const tbody = $("operatortablebody");
    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error("Failed to load");
        const users = await res.json();
        tbody.innerHTML = "";

        users.forEach((u, i) => {
            const tr = document.createElement("tr");
            const cell = value => {
                const td = document.createElement("td");
                td.textContent = value ?? "";
                return td;
            };

            tr.append(cell(i + 1), cell(u.name), cell(u.email));

            const role = cell("");
            const badge = document.createElement("span");
            badge.className = `role-badge role-${String(u.role).toLowerCase()}`;
            badge.textContent = u.role || "";
            role.append(badge);
            tr.append(role);

            const actions = cell("");
            const edit = document.createElement("button");
            edit.className = "edit-btn";
            edit.innerHTML ='<i class="fas fa-edit"></i> Edit';
            edit.onclick = () => startEdit(u);
            actions.append(edit);

            // Admin cannot be deleted
            if (String(u.role).toLowerCase() !== "admin") {
                const del = document.createElement("button");
                del.className = "delete-btn";
                del.innerHTML='<i class="fas fa-trash"></i> Delete';
                del.onclick = () => confirmDelete(u.id);
                actions.append(del);
            }

            tr.append(actions);
            tbody.append(tr);
        });

        if (!users.length)
            tbody.innerHTML = '<tr><td colspan="5">No operators found.</td></tr>';
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5">Unable to load operators.</td></tr>';
    }
}

// Open and scroll to a form
function showForm(id) {
    $(id).style.display = "block";
    $(id).scrollIntoView({ behavior: "smooth", block: "center" });
}

// Add operator button
$("add-operator1").addEventListener("click", () => {
    $("addOperatorForm").reset();
    showForm("add-operator-section");
    $("addName").focus();
});

// Add operator and save to spreadsheet
$("addOperatorForm").addEventListener("submit", async e => {
    e.preventDefault();
    await send("/api/operators", "POST", {
        name: $("addName").value.trim(),
        email: $("addEmail").value.trim(),
        role: $("addRole").value
    }, "add-operator-section", e.target);
});

// Open edit form with existing details
function startEdit(u) {
    $("editId").value = u.id;
    $("editName").value = u.name || "";
    $("editEmail").value = u.email || "";
    $("editRole").value = u.role || "Operator";
    showForm("edit-operatorSection");
    $("editName").focus();
}

// Update operator and spreadsheet
$("editOperatorForm").addEventListener("submit", async e => {
    e.preventDefault();
    await send(`${API}/${$("editId").value}`, "PUT", {
        name: $("editName").value.trim(),
        email: $("editEmail").value.trim(),
        role: $("editRole").value
    }, "edit-operatorSection", e.target);
});

// Send changes to backend
async function send(url, method, body, section, form) {
    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok || !data.success)
            throw new Error(data.error || "Operation failed");

        form.reset();
        $(section).style.display = "none";
        await fetchOperators();
        $("operatortablebody").scrollIntoView({ behavior: "smooth" });
        alert("Saved successfully!");
    } catch (err) {
        alert(err.message);
    }
}

// Confirm before permanent deletion
async function confirmDelete(id) {
    if (!confirm("Delete this operator permanently?")) return;
    try {
        const res = await fetch(`${API}/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success)
            throw new Error(data.error || "Delete failed");
        await fetchOperators();
        alert("Operator deleted successfully!");
    } catch (err) {
        alert(err.message);
    }
}

// Cancel buttons
$("cancelAdd").addEventListener("click", () => {
    $("addOperatorForm").reset();
    $("add-operator-section").style.display = "none";
});
$("cancelEdit").addEventListener("click", () => {
    $("editOperatorForm").reset();
    $("edit-operatorSection").style.display = "none";
});

// Initial setup
document.addEventListener("DOMContentLoaded", () => {
fetchOperators();

const addSection = $("add-operator-section");
const editSection = $("edit-operatorSection");

if (addSection) addSection.style.display = "none";
if (editSection) editSection.style.display = "none";

console.log("Operator page JavaScript loaded successfully.");

});
