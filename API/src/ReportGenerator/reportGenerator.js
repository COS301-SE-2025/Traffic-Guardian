const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function generatePDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const filePath = path.join(__dirname, "template.html");
  await page.goto(`file://${filePath}`, { waitUntil: "networkidle0" });

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

generatePDF();