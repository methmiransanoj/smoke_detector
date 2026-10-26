const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const XLSX = require("@stackline/xlsx");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// File path for operator spreadsheet
const filePath = path.join(__dirname, "operator.ods");
// ALERT STORAGE
const alertsFilePath = path.join(__dirname, "report.json");
// Create alerts.json automatically if it doesn't exist
if (!fs.existsSync(alertsFilePath)) {
    fs.writeFileSync(alertsFilePath, "[]", "utf8");
}
// Read all saved alerts
function getAlerts() {
    try {
        return JSON.parse(fs.readFileSync(alertsFilePath, "utf8"));
    } catch (error) {
        console.error("Error reading alerts:", error);
        throw error;
    }
}
// Save all alerts
function saveAlerts(alerts) {
    fs.writeFileSync( alertsFilePath,JSON.stringify(alerts, null, 2),"utf8");
}
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

// SENSOR DATA
let sensorData = {
    mq2: 0,
    mq9: 0,
    mq135: 0,
    smokeDetected: false,
    alertTime: null,
    deviceOnline: false,
    lastReceived: null
};
// RECEIVE SENSOR DATA
app.post("/api/sensors", (req, res) => {
    const { mq2, mq9, mq135, smokeDetected } = req.body;

    sensorData = {
        mq2: Number(mq2) || 0,
        mq9: Number(mq9) || 0,
        mq135: Number(mq135) || 0,
        smokeDetected: smokeDetected ?? false,
        alertTime: smokeDetected
            ? new Date().toISOString()
            : sensorData.alertTime,
        deviceOnline: true,
        lastReceived: new Date().toISOString()
    };

    res.json({
        success: true,
        message: "Sensor data received"
    });
});

// SEND SENSOR DATA TO DASHBOARD
app.get("/api/sensors", (req, res) => {
    // Consider the device offline if no data arrives for 15 seconds.
    const lastTime = sensorData.lastReceived
        ? new Date(sensorData.lastReceived).getTime()
        : 0;

    const online = lastTime > 0 &&
        Date.now() - lastTime < 15000;

    res.json({
        ...sensorData,
        deviceOnline: online
    });
});
// GET ALL SAVED ALERTS
app.get("/api/alerts", (req, res) => {
    try {
        const alerts = getAlerts();
        res.json(alerts);
    } catch (error) {
        res.status(500).json({
            error: "Unable to load alerts"
        });
    }
});

// CREATE AND SAVE A NEW ALERT
app.post("/api/alerts", (req, res) => {
    try {
        const { device, sensor, value, level, status } = req.body;

        if (!device || !sensor || !level || !status) {
            return res.status(400).json({
                error: "Device, sensor, level and status are required"
            });
        }

        if (value === undefined || value === null || !Number.isFinite(Number(value))) {
            return res.status(400).json({
                error: "A valid sensor value is required"
            });
        }

        const alerts = getAlerts();

        const newAlert = {
            id: Date.now().toString() + "-" +
                Math.random().toString(36).slice(2, 8),
            time: new Date().toISOString(),
            device: String(device),
            sensor: String(sensor),
            value: Number(value),
            level: String(level).toUpperCase(),
            status: String(status)
        };

        alerts.unshift(newAlert);
        saveAlerts(alerts);

        res.status(201).json({
            success: true,
            alert: newAlert
        });

    } catch (error) {
        console.error("Error saving alert:", error);

        res.status(500).json({
            error: "Unable to save alert"
        });
    }
});
// 3. OPERATOR MANAGEMENT ENDPOINTS (ODS CRUD)
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