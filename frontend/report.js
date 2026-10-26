const alertsBody = document.getElementById("all-alerts-body");
const alertCount = document.getElementById("alert-count");
const alertMessage = document.getElementById("alert-message");
const alertRange = document.getElementById("alert-range");
const refreshButton = document.getElementById("refresh-button");

function formatDateTime(value) {
if (!value) return "--";


const date = new Date(value);

if (Number.isNaN(date.getTime())) return "--";

return date.toLocaleString();


}

function getLevelClass(level) {
const value = String(level || "").toUpperCase();

if (value === "HIGH") return "badge-high";
if (value === "MEDIUM" || value === "CAUTION") {
    return "badge-medium";
}

return "badge-low";


}

function getStatusClass(status) {
return String(status || "").toLowerCase() === "resolved"
? "badge-resolved"
: "badge-active";
}

function addCell(row, value) {
const cell = document.createElement("td");
cell.textContent = value ?? "";
row.appendChild(cell);
return cell;
}

function addBadgeCell(row, value, className) {
const cell = document.createElement("td");
const badge = document.createElement("span");


badge.className = "badge " + className;
badge.textContent = value || "Unknown";

cell.appendChild(badge);
row.appendChild(cell);


}

function renderAlerts(alerts) {
alertsBody.replaceChildren();


// The total is based on all saved alerts, not visible rows.
alertCount.textContent = alerts.length;

if (alerts.length === 0) {
    const row = alertsBody.insertRow();
    const cell = row.insertCell();

    cell.colSpan = 5;
    cell.className = "empty-message";
    cell.textContent = "No alerts have been recorded yet.";

    alertMessage.textContent = "No saved alerts";
    alertRange.textContent = "0 alerts";

    return;
}

alerts.forEach(alert => {
    const row = document.createElement("tr");

    addCell(row, formatDateTime(alert.time));
    addCell(row, alert.device || "Smart Smoke Monitor");

    // Display the sensor name and actual stored reading.
    // Readings are raw sensor values unless calibrated by the project.
    const sensorName = alert.sensor || "Unknown sensor";
    const reading = alert.value;

    const typeText = reading !== undefined && reading !== null
        ? `${sensorName} (${reading})`
        : sensorName;

    addCell(row, typeText);

    addBadgeCell(
        row,
        String(alert.level || "UNKNOWN").toUpperCase(),
        getLevelClass(alert.level)
    );

    const statusCell = document.createElement("td");
    statusCell.className = "text-right";

    const badge = document.createElement("span");
    badge.className = "badge " + getStatusClass(alert.status);
    badge.textContent = alert.status || "Active";

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    alertsBody.appendChild(row);
});

alertMessage.textContent = "Showing all saved alerts";
alertRange.textContent = `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`;


}

async function loadAllAlerts() {
refreshButton.disabled = true;
alertMessage.textContent = "Loading alerts...";


try {
    const response = await fetch("/api/alerts", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Server returned " + response.status);
    }

    const alerts = await response.json();

    if (!Array.isArray(alerts)) {
        throw new Error("Invalid alert data received");
    }

    // Newest first.
    alerts.sort((a, b) => {
        return new Date(b.time).getTime() -
               new Date(a.time).getTime();
    });

    renderAlerts(alerts);
} catch (error) {
    console.error("Unable to load alerts:", error);

    alertsBody.replaceChildren();

    const row = alertsBody.insertRow();
    const cell = row.insertCell();

    cell.colSpan = 5;
    cell.className = "empty-message";
    cell.textContent = "Unable to load alerts. Check the server.";

    alertMessage.textContent = "Failed to load saved alerts";
    alertRange.textContent = "";
} finally {
    refreshButton.disabled = false;
}


}

refreshButton.addEventListener("click", loadAllAlerts);

loadAllAlerts();
