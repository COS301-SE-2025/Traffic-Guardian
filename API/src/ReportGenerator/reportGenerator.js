const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function generatePDF(incidents = []) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const filePath = path.join(__dirname, "template.html");
  let htmlContent = fs.readFileSync(filePath, "utf-8");

  const incidentsHtml = incidents.map(incident => `
    <div class="incident-entry">
      <div class="form-group"><label>Date & Time:</label> ${incident.Incidents_DateTime}</div>
      <div class="form-group"><label>Longitude:</label> ${incident.Incidents_Longitude}</div>
      <div class="form-group"><label>Latitude:</label> ${incident.Incidents_Latitude}</div>
      <div class="form-group"><label>Severity:</label> ${incident.Incident_Severity}</div>
      <div class="form-group"><label>Status:</label> ${incident.Incident_Status}</div>
      <div class="form-group"><label>Reporter:</label> ${incident.Incident_Reporter}</div>
      <div class="form-group"><label>Camera ID:</label> ${incident.Incident_CameraID}</div>
      <div class="form-group"><label>Description:</label> ${incident.Incident_Description}</div>
      <hr>
    </div>
  `).join("");

  htmlContent = htmlContent.replace("<!-- INCIDENTS_PLACEHOLDER -->", incidentsHtml);

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pdfPath = path.join(reportsDir, `report-${timestamp}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();
  console.log("Report generated:", pdfPath);
}

module.exports = { 
  generatePDF 
};


//testing
const incidents = [
  {
    Incidents_DateTime: "2025-09-15 14:00",
    Incidents_Longitude: 28.0473,
    Incidents_Latitude: -26.2041,
    Incident_Severity: "High",
    Incident_Status: "Open",
    Incident_Reporter: "John Doe",
    Incident_CameraID: "CAM123",
    Incident_Description: "Minor collision"
  }
];

// generatePDF(incidents);
