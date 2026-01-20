import crypto from 'crypto';
import nodemailer from 'nodemailer';
import EmailVerification from '../models/EmailVerification.js';


export const generateVerificationCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};


export const sendVerificationEmail = async (email, code) => {
    //test email
    console.log('========================================');
    console.log('EMAIL VERIFICATION CODE');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Mã xác thực email - Thanh Tú Store`);
    console.log(`Code: ${code}`);
    console.log(`Mã xác thực của bạn là: ${code}`);
    console.log('Mã này có hiệu lực trong 15 phút.');
    console.log('========================================');

    //production
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Mã xác thực email - Thanh Tú Store',
        html: `
            <h2>Mã xác thực email</h2>
            <p>Mã xác thực của bạn là: <strong>${code}</strong></p>
            <p>Mã này có hiệu lực trong 15 phút.</p>
        `,
    });
};


export const createVerificationCode = async (userId, email) => {
    const code = generateVerificationCode();

    // Xóa các mã cũ của cùng một user trước khi tạo mã mới
    await EmailVerification.deleteMany({
        userId,
        isUsed: false,
    });

    const verification = await EmailVerification.create({
        userId,
        email,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15p
    });

    return verification;
};

