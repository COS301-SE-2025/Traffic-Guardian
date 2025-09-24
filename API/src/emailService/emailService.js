const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_email@gmail.com",      // your email
    pass: "your_app_password",         // use App Password (not normal Gmail password)
  },
});

// Function to send an email
export async function sendEmail(to, subject, text, html) {
  try {
    const info = await transporter.sendMail({
      from: '"My App" <your_email@gmail.com>',
      to,              // recipient
      subject,         // subject line
      text,            // plain text body
      html,            // html body (optional)
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}


module.exports = {
    sendEmail
};