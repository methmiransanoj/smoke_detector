const express = require("express");
const cors = require("cors");
const path = require("path");
const XLSX = require("@stackline/xlsx");

const app = express();
app.use(cors());
app.use(express.json());
// Serve the frontend
app.use(express.static(path.join(__dirname, "../frontend")));
// login -read user from operator.ods
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    try {
        // Location of data.ods
        const filePath = path.join(__dirname, "operator.ods");
        // Read ODS file
        const workbook = XLSX.readFile(filePath);
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert spreadsheet to JavaScript objects
        const users = XLSX.utils.sheet_to_json(sheet);
        // Find matching user
        console.log("Username entered:", username);
        console.log("Password entered:", password);
        console.log("Users from ODS:", users);

        const user = users.find((u) => {
            const odsUsername = String(u.username ?? "").trim().toLowerCase();
            const odsPassword = String(u.password ?? "").trim();
            const enteredUsername = String(username ?? "").trim().toLowerCase();
            const enteredPassword = String(password ?? "").trim();
            console.log("ODS Username:", odsUsername);
            console.log("Entered Username:", enteredUsername);
            console.log("ODS Password:", odsPassword);
            console.log("Entered Password:", enteredPassword);
            console.log("Username Match:", odsUsername === enteredUsername);
            console.log("Password Match:", odsPassword === enteredPassword);
            return (
                odsUsername === enteredUsername &&
                odsPassword === enteredPassword
            );
        });
        // Login successful
        if (user) {
            console.log(`Login successful: ${user.Username}`);
            res.json({
                success: true,
                name: user.name,
                email: user.email,
                role: user.role
            });
        }
        // Login failed
        else {
            console.log(`Login failed: ${username}`);
            res.json({
                success: false,
                message: "Invalid username or password"
            });
        }
    } catch (error) {
        console.error("Error reading operator.ods:", error);
        res.status(500).json({
            success: false,
            message: "Unable to read operator.ods"
        });
    }
});
// Current sensor data
let sensorData = {
    mq2: 0,
    mq9: 0,
    mq135: 0,
    smokeDetected: false,
    alertTime: null
};
// Receive sensor data
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
    console.log("Sensor data received:");
    console.log(sensorData);
    res.json({
        success: true,
        message: "Sensor data received"
    });
});
// Send current sensor data
app.get("/api/sensors", (req, res) => {
    res.json(sensorData);
});

// Start server
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});