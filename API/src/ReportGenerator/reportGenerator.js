const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const emailSender = require("../emailService/emailService");

async function generateAndSend(incidents, userEmail){
  const pdfPATH = await generatePDF(incidents, userEmail);
  console.log(pdfPATH);
}



//sendEmail(to, subject, text, html, reportName, reportFile)

async function generatePDF(incidents = [], User_Email) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const logoPath = path.join(__dirname, "TrafficGuardianLogo1_LightFinal.PNG");
  const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Incident Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; background-color: #262b2f; color: #000; }
        .header { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .header img { height: 60px; margin-right: 15px; }
        .header h2 { color: orange; letter-spacing: 1px; margin: 0; font-size: 28px; }
        .section { background-color: #c1c1c1; padding: 10px; margin-top: 20px; font-weight: bold; border: 1px solid #b5cce5; border-radius: 4px; }
        .incident-entry { border: 2px solid #ffa600; border-radius: 8px; padding: 20px; margin-top: 20px; background-color: #f5f5f5; }
        .form-group { display: flex; align-items: center; margin-bottom: 12px; }
        label { flex: 0 0 180px; font-weight: bold; color: #262b2f; }
        .form-value { flex: 1; padding: 6px 10px; background: #fff; border: 1px solid #ccc; border-radius: 4px; min-height: 24px; }
        hr { border: none; border-top: 1px dashed #aaa; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoDataUrl}" alt="Traffic Guardian Logo">
        <h2>TRAFFIC GUARDIAN INCIDENT REPORT</h2>
      </div>
      <div class="section">INCIDENT DETAILS</div>
      <div id="incident-container">${incidentsHtml}</div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pdfPath = path.join(reportsDir, `report-${timestamp}.pdf`);

  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();

  console.log("Report generated:", pdfPath);
  //sendEmail(to, subject, text, html, attachmentPath)
  const recipientEmail = User_Email || process.env.EMAIL_ADDRESS;

  if (!recipientEmail) {
    console.error("No recipient email address available");
    return pdfPath;
  }

  try {
    await emailSender.sendEmail(
      recipientEmail,
      "Traffic Guardian Report",
      "Please find your incident report attached.",
      `<p>Dear ${incidents[0]?.Incident_Reporter || 'User'},</p><p>Please find your Traffic Guardian incident report attached.</p>`,
      pdfPath
    );
    console.log("Email sent successfully to:", recipientEmail);
  } catch (error) {
    console.error("Failed to send email:", error.message);
  }

  return pdfPath;
}

module.exports = { 
  generatePDF,
  generateAndSend
};