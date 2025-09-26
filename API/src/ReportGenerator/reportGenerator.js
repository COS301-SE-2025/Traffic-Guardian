const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const emailSender = require("../emailService/emailService");

async function generatePDF(incidents = [], User_Email) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const filePath = path.join(__dirname, "template.html");
  let htmlContent = fs.readFileSync(filePath, "utf-8");

  const incidentsHtml = incidents.map(incident => `
    <div class="incident-entry">
      <div class="form-group"><label>Date & Time:</label> ${incident.Incidents_DateTime ?? ""}</div>
      <div class="form-group"><label>Longitude:</label> ${incident.Incidents_Longitude ?? ""}</div>
      <div class="form-group"><label>Latitude:</label> ${incident.Incidents_Latitude ?? ""}</div>
      <div class="form-group"><label>Severity:</label> ${incident.Incident_Severity ?? ""}</div>
      <div class="form-group"><label>Status:</label> ${incident.Incident_Status ?? ""}</div>
      <div class="form-group"><label>Reporter:</label> ${incident.Incident_Reporter ?? ""}</div>
      <div class="form-group"><label>Camera ID:</label> ${incident.Incident_CameraID ?? ""}</div>
      <div class="form-group"><label>Description:</label> ${incident.Incident_Description ?? ""}</div>
      <div class="form-group"><label>Reporter Email:</label> ${User_Email ?? ""}</div>
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
  //sendEmail(to, subject, text, html, reportName, reportFile)
  await emailSender.sendEmail(User_Email, "Traffic Gaurdian Report", "", incidents[0].Incident_Reporter, pdfPath);
  return pdfPath;
}



module.exports = { 
  generatePDF,
  generateAndSend
};

async function generateAndSend(){
  const pdfPATH = await generatePDF(incidents, User_Email);
  console.log(pdfPATH);
  await emailSender.sendEmail("aryanmohanlall@gmail.com", "Traffic Gaurdian Report", "", incidents[0].Incident_Reporter, pdfPATH);
}

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


//sendEmail(to, subject, text, html, reportName, reportFile)