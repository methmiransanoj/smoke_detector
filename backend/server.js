const express = require("express");
const cors = require("cors");
const path = require("path");
const XLSX = require("@stackline/xlsx");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// File path for operator spreadsheet
const filePath = path.join(__dirname, "operator.ods");

// Helper to read operators from ODS file
const getOperators = () => {
    try {
        const wb = XLSX.readFile(filePath);

        if (!wb.SheetNames.length) {
            console.error("No sheets found in operator.ods");
            return [];
        }

        const sheet = wb.Sheets[wb.SheetNames[0]];
        const users = XLSX.utils.sheet_to_json(sheet);

        console.log("Operators loaded from ODS:", users.length);
        console.log("Spreadsheet columns:", Object.keys(users[0] || {}));

        return users;
    } catch (err) {
        console.error("Error reading operator.ods:", err);
        throw err;
    }
};

// Helper to save operators back to ODS file
const saveOperators = (users) => {
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(users);
    XLSX.writeFile(wb, filePath);
};

// ==========================================
// 1. AUTH / LOGIN ENDPOINT
// ==========================================
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    try {
        const users = getOperators();

        console.log("Username entered:", username);
        console.log("Password entered:", password);

        const user = users.find((u) => {
            const odsUsername = String(u.username ?? "").trim().toLowerCase();
            const odsPassword = String(u.password ?? "").trim();
            const enteredUsername = String(username ?? "").trim().toLowerCase();
            const enteredPassword = String(password ?? "").trim();
            return (
                odsUsername === enteredUsername &&
                odsPassword === enteredPassword
            );
        });

        if (user) {
            console.log(`Login successful: ${user.name || user.username}`);
            res.json({
                success: true,
                name: user.name,
                email: user.email,
                role: user.role
            });
        } else {
            console.log(`Login failed for username: ${username}`);
            res.json({
                success: false,
                message: "Invalid username or password"
            });
        }
    } catch (error) {
        console.error("Error processing login:", error);
        res.status(500).json({
            success: false,
            message: "Unable to process login request"
        });
    }
});

// ==========================================
// 2. SENSOR ENDPOINTS
// ==========================================
let sensorData = {
    mq2: 0,
    mq9: 0,
    mq135: 0,
    smokeDetected: false,
    alertTime: null
};

app.post("/api/sensors", (req, res) => {
    const { mq2, mq9, mq135, smokeDetected } = req.body;
    sensorData = {
        mq2: mq2 ?? 0,
        mq9: mq9 ?? 0,
        mq135: mq135 ?? 0,
        smokeDetected: smokeDetected ?? false,
        alertTime: smokeDetected
            ? new Date().toISOString()
            : sensorData.alertTime
    };
    res.json({
        success: true,
        message: "Sensor data received"
    });
});

app.get("/api/sensors", (req, res) => {
    res.json(sensorData);
});

// ==========================================
// 3. OPERATOR MANAGEMENT ENDPOINTS (ODS CRUD)
// ==========================================

// READ ALL OPERATORS
// READ ALL OPERATORS
app.get("/api/operators", (req, res) => {
    try {
        const users = getOperators();

        const list = users.map((user, id) => ({
            id,
            name: user.name ?? "",
            email: user.email ?? "",
            role: user.role ?? ""
        }));

        res.json(list);
    } catch (err) {
        console.error("Error loading operators:", err);
        res.status(500).json({
            error: "Unable to load operators from operator.ods"
        });
    }
});

// CREATE NEW OPERATOR
app.post("/api/operators", (req, res) => {
    try {
        const users = getOperators();
        const { name, email, role, username, password } = req.body;

        const newOperator = {
            name: name || "",
            email: email || "",
            role: role || "Viewer",
            // If username/password are not supplied by the form, set defaults:
            username: username || (email ? email.split("@")[0] : "user" + (users.length + 1)),
            password: password || "123456"
        };

        users.push(newOperator);
        saveOperators(users);
        res.json({ success: true, operator: newOperator });
    } catch (err) {
        console.error("Error adding operator:", err);
        res.status(500).json({ error: "Failed to add operator to ODS file" });
    }
});

// UPDATE EXISTING OPERATOR
app.put("/api/operators/:id", (req, res) => {
    try {
        const users = getOperators();
        const id = Number(req.params.id);

        if (isNaN(id) || !users[id]) {
            return res.status(404).json({ error: "Operator not found" });
        }

        // Merge updated fields while retaining existing credentials
        users[id] = {
            ...users[id],
            name: req.body.name ?? users[id].name,
            email: req.body.email ?? users[id].email,
            role: req.body.role ?? users[id].role
        };

        saveOperators(users);
        res.json({ success: true, operator: users[id] });
    } catch (err) {
        console.error("Error updating operator:", err);
        res.status(500).json({ error: "Failed to update operator in ODS file" });
    }
});

// DELETE OPERATOR (Restricted for Admin role)
app.delete("/api/operators/:id", (req, res) => {
    try {
        const users = getOperators();
        const id = Number(req.params.id);

        if (isNaN(id) || !users[id]) {
            return res.status(404).json({ error: "Operator not found" });
        }

        if (String(users[id].role).toLowerCase() === "admin") {
            return res.status(403).json({ error: "Cannot delete an Admin" });
        }

        users.splice(id, 1);
        saveOperators(users);
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting operator:", err);
        res.status(500).json({ error: "Failed to delete operator from ODS file" });
    }
});

// ==========================================
// START SERVER
// ==========================================
app.get("/test", (req, res) => {
    res.send("Correct server.js is running!");
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});