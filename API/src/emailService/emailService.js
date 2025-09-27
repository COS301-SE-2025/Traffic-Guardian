const nodemailer = require("nodemailer");
const path = require("path");
require('dotenv').config({
path: require('path').join(__dirname, '../../.env')
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "aryanmohanlall@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail(to, subject, text, html, attachmentPath) {
  try {
    const info = await transporter.sendMail({
      from: '"Traffic Guardian Report" <aryanmohanlall@gmail.com>',
      to,
      subject,
      text,
      html,
      attachments: attachmentPath
        ? [
            {
              filename: path.basename(attachmentPath),
              path: attachmentPath,
              contentType: "application/pdf",
            },
          ]
        : [],
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}


//sendEmail("aryanmohanlall@gmail.com", "Traffic Gaurdian Report", "Kindly find below your incident report summary");

module.exports = {
    sendEmail
};