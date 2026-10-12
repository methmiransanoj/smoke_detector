// =====================================================
// SMART SMOKE MONITOR - SCRIPT.JS
// =====================================================

// 1. SENSOR DATA
let sensorData = {
    mq2: 0,
    mq9: 0,
    mq135: 0
};

let deviceOnline = false;
let lastDataTime = null;
let lastAlertLevel = "LOW";

// 2. GET CURRENT TIME
function getCurrentTime() {
    let now = new Date();
    return now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

// 3. GET DATE AND TIME
function getDateTime() {
    let now = new Date();
    return now.toLocaleString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

// 4. MQ-2 STATUS (< 400: Normal, 400-700: Caution, > 700: High)
function getMQ2Level(value) {
    if (value === 0) return "Waiting";
    if (value < 400) return "Normal";
    if (value <= 700) return "Caution";
    return "High";
}

// 5. MQ-9 STATUS (< 200: Normal, 200-500: Caution, > 500: High)
function getMQ9Level(value) {
    if (value === 0) return "Waiting";
    if (value < 200) return "Normal";
    if (value <= 500) return "Caution";
    return "High";
}

// 6. MQ-135 STATUS (< 450: Normal, 450-650: Caution, > 650: High)
function getMQ135Level(value) {
    if (value === 0) return "Waiting";
    if (value < 450) return "Normal";
    if (value <= 650) return "Caution";
    return "High";
}

// 7. GET BADGE CLASS
function getStatusClass(level) {
    if (level === "Normal") return "badge-normal";
    if (level === "Caution") return "badge-warning";
    if (level === "High") return "badge-high";
    return "badge-low";
}

// 8. UPDATE SENSOR VALUES ON DASHBOARD
function updateSensorValues() {
    let mq2Element = document.getElementById("val-mq2");
    let mq9Element = document.getElementById("val-mq9");
    let mq135Element = document.querySelector(".val-mq135");

    if (mq2Element) mq2Element.textContent = sensorData.mq2;
    if (mq9Element) mq9Element.textContent = sensorData.mq9;
    if (mq135Element) mq135Element.textContent = sensorData.mq135;
}

// 9. UPDATE SENSOR STATUS BADGES
function updateSensorStatus() {
    let mq2Level = getMQ2Level(sensorData.mq2);
    let mq9Level = getMQ9Level(sensorData.mq9);
    let mq135Level = getMQ135Level(sensorData.mq135);

    let sensorBoxes = document.querySelectorAll(".sensor-box");

    if (sensorBoxes[0]) {
        let badge = sensorBoxes[0].querySelector(".badge");
        if (badge) {
            badge.textContent = mq2Level;
            badge.className = "badge " + getStatusClass(mq2Level);
        }
    }

    if (sensorBoxes[1]) {
        let badge = sensorBoxes[1].querySelector(".badge");
        if (badge) {
            badge.textContent = mq9Level;
            badge.className = "badge " + getStatusClass(mq9Level);
        }
    }

    if (sensorBoxes[2]) {
        let badge = sensorBoxes[2].querySelector(".badge");
        if (badge) {
            badge.textContent = mq135Level;
            badge.className = "badge " + getStatusClass(mq135Level);
        }
    }
}

// 10. GET OVERALL RISK LEVEL
function getRiskLevel() {
    let mq2Level = getMQ2Level(sensorData.mq2);
    let mq9Level = getMQ9Level(sensorData.mq9);
    let mq135Level = getMQ135Level(sensorData.mq135);

    if (sensorData.mq2 === 0 && sensorData.mq9 === 0 && sensorData.mq135 === 0) {
        return "WAITING";
    }

    if (mq2Level === "High" || mq9Level === "High" || mq135Level === "High") {
        return "HIGH";
    }

    if (mq2Level === "Caution" || mq9Level === "Caution" || mq135Level === "Caution") {
        return "MEDIUM";
    }

    return "LOW";
}

// 11. UPDATE RISK LEVEL
function updateRiskLevel() {
    let risk = getRiskLevel();
    let riskElement = document.querySelector(".val-medium");

    if (!riskElement) return;

    riskElement.textContent = risk;
    riskElement.classList.remove("val-low", "val-medium", "val-high");

    if (risk === "LOW") {
        riskElement.classList.add("val-low");
    } else if (risk === "MEDIUM") {
        riskElement.classList.add("val-medium");
    } else if (risk === "HIGH") {
        riskElement.classList.add("val-high");
    } else {
        riskElement.classList.add("val-medium");
    }
}
// 12. UPDATE DEVICE STATUS
function updateDeviceStatus() {
    let deviceElement = document.querySelector(".val-online");
    if (!deviceElement) return;

    if (deviceOnline) {
        deviceElement.textContent = "Online";
        deviceElement.classList.remove("val-offline");
        deviceElement.classList.add("val-online");
    } else {
        deviceElement.textContent = "Offline";
        deviceElement.classList.remove("val-online");
        deviceElement.classList.add("val-offline");
    }
}
// 13. UPDATE TIME
function updateTime() {
    let timestamp = document.querySelector(".live-timestamp");
    if (timestamp) {
        timestamp.textContent = getDateTime();
    }
    let lastSeen = document.getElementById("last-seen-sub");
    if (lastSeen && lastDataTime) {
        lastSeen.textContent = "Last seen: " + lastDataTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}
// 14. GET REAL SENSOR DATA FROM BACKEND
async function getSensorData() {
    try {
        let response = await fetch("/api/sensors");
        if (!response.ok) {
            throw new Error("Server returned " + response.status);
        }

        let data = await response.json();

        sensorData.mq2 = Number(data.mq2) || 0;
        sensorData.mq9 = Number(data.mq9) || 0;
        sensorData.mq135 = Number(data.mq135) || 0;
        deviceOnline = data.deviceOnline === true;
        if (data.lastReceived) {
            lastDataTime = new Date(data.lastReceived);
        }
        updateDashboard();
        if (deviceOnline) {
            addLatestData();
            checkForAlert();
        }
        console.log("Sensor data received:", sensorData);
        console.log("Device online:", deviceOnline);
    } catch (error) {
        console.log("Waiting for sensor/backend data...", error);
        deviceOnline = false;
        updateDeviceStatus();
    }
}
// 15. ADD ACTUAL DATA TO LATEST DATA TABLE
function addLatestData() {
    let table = document.getElementById("latest-data-body");
    if (!table) return;

    let mq2 = sensorData.mq2;
    let mq9 = sensorData.mq9;
    let mq135 = sensorData.mq135;

    let mq2Level = getMQ2Level(mq2);
    let mq9Level = getMQ9Level(mq9);
    let mq135Level = getMQ135Level(mq135);

    let status = "Normal";

    if (mq2Level === "High" || mq9Level === "High" || mq135Level === "High") {
        status = "High";
    } else if (mq2Level === "Caution" || mq9Level === "Caution" || mq135Level === "Caution") {
        status = "Caution";
    }

    if (mq2 === 0 && mq9 === 0 && mq135 === 0) {
        status = "Waiting";
    }

    let badgeClass = "badge-normal";
    if (status === "High") badgeClass = "badge-high";
    else if (status === "Caution") badgeClass = "badge-warning";
    else if (status === "Waiting") badgeClass = "badge-low";

    let newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="font-mono">${getCurrentTime()}</td>
        <td>${mq2}</td>
        <td>${mq9}</td>
        <td>${mq135}</td>
        <td class="text-right">
            <span class="badge ${badgeClass}">${status}</span>
        </td>
    `;

    table.prepend(newRow);

    while (table.children.length > 5) {
        table.removeChild(table.lastElementChild);
    }
}

// 16. GET SENSOR THAT CAUSED ALERT
function getAlertSensor() {
    if (getMQ2Level(sensorData.mq2) === "High") return "MQ-2";
    if (getMQ9Level(sensorData.mq9) === "High") return "MQ-9";
    if (getMQ135Level(sensorData.mq135) === "High") return "MQ-135";

    if (getMQ2Level(sensorData.mq2) === "Caution") return "MQ-2";
    if (getMQ9Level(sensorData.mq9) === "Caution") return "MQ-9";
    if (getMQ135Level(sensorData.mq135) === "Caution") return "MQ-135";

    return "-";
}

// 17. CHECK FOR ALERT
function checkForAlert() {
    if (!deviceOnline) {
        return;
    }
    let risk = getRiskLevel();
    if (risk === lastAlertLevel) {
        return;
    }
    if (risk === "MEDIUM" || risk === "HIGH") {
        let sensor = getAlertSensor();
        addAlert(sensor, risk);
    }
    lastAlertLevel = risk;
}
// 18. ADD ALERT TO RECENT ALERTS TABLE
function addAlert(sensor, level) {
    let table = document.querySelector(".two-col-grid .dashboard-card:nth-child(2) tbody");
    if (!table) return;

    let badgeClass = level === "HIGH" ? "badge-high" : "badge-warning";

    let newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="font-mono">${getCurrentTime()}</td>
        <td>Smart Smoke Monitor</td>
        <td>${sensor}</td>
        <td>
            <span class="badge ${badgeClass}">${level}</span>
        </td>
        <td class="text-right">
            <span class="badge badge-low">Active</span>
        </td>
    `;

    table.prepend(newRow);

    while (table.children.length > 5) {
        table.removeChild(table.lastElementChild);
    }
}

// 19. UPDATE WHOLE DASHBOARD
function updateDashboard() {
    updateSensorValues();
    updateSensorStatus();
    updateRiskLevel();
    updateDeviceStatus();
    updateTime();
}

// 20. PAGE LOAD
document.addEventListener("DOMContentLoaded", function () {
    updateDashboard();
    getSensorData();

    setInterval(function () {
        getSensorData();
    }, 5000);
});