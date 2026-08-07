const nodemailer = require('nodemailer');

function createTransporter() {
	const host = process.env.EMAIL_HOST;
	const port = process.env.EMAIL_PORT || 587;
	const user = process.env.EMAIL_USER;
	const pass = process.env.EMAIL_PASS;

	if (!host || !user || !pass) {
		console.warn('Email config missing. Set EMAIL_HOST, EMAIL_USER and EMAIL_PASS in .env to enable email sending.');
		return null;
	}

	return nodemailer.createTransport({
		host,
		port: Number(port),
		secure: Number(port) === 465,
		auth: { user, pass }
	});
}

async function sendOtpEmail(to, otp) {
	return sendEmail(to, 'Your FoodConnect verification code', `Your verification code is: ${otp}. It is valid for 10 minutes.`, `<p>Your verification code is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`);
}

async function sendEmail(to, subject, text, html) {
	const transporter = createTransporter();
	if (!transporter) return false;

	const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
	const mailOptions = { from, to, subject, text, html };
	try {
		await transporter.sendMail(mailOptions);
		return true;
	} catch (err) {
		console.error('Error sending email:', err);
		return false;
	}
}

module.exports = { sendOtpEmail, sendEmail };
