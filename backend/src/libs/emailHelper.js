import crypto from 'crypto';
import nodemailer from 'nodemailer';
import EmailVerification from '../models/EmailVerification.js';

const escapeHtml = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');


export const generateVerificationCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};


export const sendVerificationEmail = async (email, code) => {
    console.log('========================================');
    console.log('EMAIL VERIFICATION CODE');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Mã xác thực email - Thanh Tú Store`);
    console.log(`Code: ${code}`);
    console.log('========================================');

    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const isSecurePort = smtpPort === 465;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: isSecurePort,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
    });

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Mã xác thực email - Thanh Tú Store',
        html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2>Mã xác thực email</h2>
                <p>Mã xác thực của bạn là: <strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>
                <p>Mã này có hiệu lực trong <strong>15 phút</strong>.</p>
            </div>
        `,
    });

    console.log(`✅ Mã xác thực đã gửi thành công đến ${email}`);
};


export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
    // Log ra console để debug
    console.log('========================================');
    console.log('PASSWORD RESET EMAIL');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Khôi phục mật khẩu - Thanh Tú Store`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('========================================');
    console.log(`Link khôi phục mật khẩu: ${resetUrl}`);
    console.log('Link này có hiệu lực trong 1 giờ.');
    console.log('========================================');


    try {
        const smtpPort = Number(process.env.SMTP_PORT) || 465;

        const isSecurePort = smtpPort === 465;

        const transporterConfig = {
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: isSecurePort,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
        };
        const transporter = nodemailer.createTransport(transporterConfig);

        await transporter.verify();

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Khôi phục mật khẩu - Thanh Tú Store',
            html: `
                    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4e54c8;">Khôi phục mật khẩu</h2>
                        <p>Xin chào,</p>
                        <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản của mình.</p>
                        <p>Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
                        <p style="margin: 20px 0;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4e54c8; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Đặt lại mật khẩu</a>
                        </p>
                        <p>Hoặc copy và dán link sau vào trình duyệt:</p>
                        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">${resetUrl}</p>
                        <p><strong>Lưu ý:</strong> Link này có hiệu lực trong <strong>1 giờ</strong>.</p>
                        <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                        <p style="color: #666; font-size: 12px;">Thanh Tú Store</p>
                    </div>
                `,
        });

        // Đóng connection sau khi gửi
        transporter.close();

        console.log(`✅ Email đã được gửi thành công đến ${email}`);
    } catch (error) {
        console.error('❌ Lỗi khi gửi email:', error.message);
        console.error('Chi tiết lỗi:', error);
    }

};


/**
 * Gửi email xác nhận khi khách gửi yêu cầu thu cũ đổi mới thành công (kèm mã tra cứu + link).
 */
export const sendBatteryTradeInConfirmationEmail = async (email, name, requestCode, lookupPageUrl) => {
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const isSecurePort = smtpPort === 465;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: isSecurePort,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
    });

    const safeName = escapeHtml(name || 'Quý khách');
    const safeCode = escapeHtml(requestCode);
    const lookupUrlRaw = String(lookupPageUrl || '').trim();
    const safeLookupUrlText = escapeHtml(lookupUrlRaw);
    const hrefAttr = lookupUrlRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `Xác nhận yêu cầu thu cũ — Mã ${requestCode} — Thanh Tú Store`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Đã nhận yêu cầu thu cũ đổi mới</h2>
                <p>Xin chào <strong>${safeName}</strong>,</p>
                <p>Chúng tôi đã nhận được yêu cầu thu cũ đổi mới ắc quy của bạn.</p>
                <p style="margin: 16px 0; padding: 12px 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-size: 13px;">Mã yêu cầu của bạn:</span><br/>
                    <strong style="font-size: 20px; letter-spacing: 1px; color: #0c4a6e;">${safeCode}</strong>
                </p>
                <p>Bạn có thể tra cứu trạng thái yêu cầu bằng <strong>mã trên</strong> và <strong>email Gmail</strong> đã đăng ký tại trang:</p>
                <p style="margin: 20px 0;">
                    <a href="${hrefAttr}" style="display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Tra cứu yêu cầu thu cũ</a>
                </p>
                <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 12px; color: #444;">${safeLookupUrlText}</p>
                <p>Chuyên viên cửa hàng sẽ liên hệ với bạn qua số điện thoại đã đăng ký trong thời gian sớm nhất.</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                <p style="color: #666; font-size: 12px;">Mọi thắc mắc xin gọi: <strong>0386806456</strong></p>
                <p style="color: #666; font-size: 12px;">Thanh Tú Store</p>
            </div>
        `,
    });

    transporter.close?.();
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

