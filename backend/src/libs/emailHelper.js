import crypto from 'crypto';
import nodemailer from 'nodemailer';
import EmailVerification from '../models/EmailVerification.js';
import { resolveFrontendBaseForLinks } from '../utils/publicAppUrl.js';

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

/**
 * Gửi email thông báo cho khách khi trạng thái thu cũ thay đổi (liên hệ / hoàn tất / hủy).
 */
export const sendBatteryTradeInStatusUpdateEmail = async ({
    email,
    name,
    requestCode,
    oldStatus,
    newStatus,
    appointmentAt,
    appointmentLocationName,
    appointmentLocationAddress,
    completedAmount,
    cancelledReason,
}) => {
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

    const statusConfigs = {
        contacted: {
            bg: '#dbeafe',
            color: '#1e40af',
            label: 'Đã liên hệ',
            icon: '✓',
            message: 'Yêu cầu thu cũ của bạn đã được xác nhận. Vui lòng mang ắc quy đến theo lịch hẹn.',
        },
        completed: {
            bg: '#d1fae5',
            color: '#065f46',
            label: 'Hoàn tất thu mua',
            icon: '🎉',
            message: `Yêu cầu thu cũ của bạn đã hoàn tất. Bạn đã nhận được ${completedAmount != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(completedAmount)) : 'số tiền thỏa thuận'}.`,
        },
        cancelled: {
            bg: '#fee2e2',
            color: '#991b1b',
            label: 'Đã hủy yêu cầu',
            icon: '✗',
            message: cancelledReason
                ? `Yêu cầu thu cũ đã bị hủy. Lý do: ${escapeHtml(cancelledReason)}`
                : 'Yêu cầu thu cũ của bạn đã bị hủy.',
        },
    };

    const cfg = statusConfigs[newStatus] || {
        bg: '#f3f4f6',
        color: '#374151',
        label: LOOKUP_STATUS_LABEL[newStatus] || newStatus,
        icon: '',
        message: 'Trạng thái yêu cầu thu cũ của bạn đã được cập nhật.',
    };

    const lookupUrl = `${getFrontendBaseUrl()}/battery-trade-in/tra-cuu`;

    let appointmentBlock = '';
    if (newStatus === 'contacted' && appointmentAt) {
        const aptDate = new Date(appointmentAt).toLocaleString('vi-VN', {
            dateStyle: 'full',
            timeStyle: 'short',
        });
        appointmentBlock = `
            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #bae6fd;">
                <p style="margin: 0 0 8px; color: #0369a1; font-weight: 700; font-size: 14px;">📅 Lịch hẹn đã xác nhận</p>
                <p style="margin: 0; font-size: 14px;"><strong>${aptDate}</strong></p>
                ${appointmentLocationName ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Cơ sở:</strong> ${escapeHtml(appointmentLocationName)}</p>` : ''}
                ${appointmentLocationAddress ? `<p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">${escapeHtml(appointmentLocationAddress)}</p>` : ''}
            </div>
        `;
    }

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `Cập nhật yêu cầu thu cũ — Mã ${requestCode} — Thanh Tú Store`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Cập nhật yêu cầu thu cũ</h2>
                <p>Xin chào <strong>${safeName}</strong>,</p>

                <div style="background: ${cfg.bg}; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: ${cfg.color};">
                        <strong>Trạng thái mới: ${cfg.label}</strong>
                    </p>
                    <p style="margin: 0; font-size: 14px; color: ${cfg.color};">${cfg.message}</p>
                </div>

                <p style="margin: 16px 0 8px; font-size: 13px; color: #64748b;">
                    Mã yêu cầu: <strong style="font-family: monospace; color: #0c4a6e;">${safeCode}</strong>
                </p>

                ${appointmentBlock}

                <p style="margin: 16px 0;">
                    <a href="${lookupUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Tra cứu trạng thái
                    </a>
                </p>

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

// ─────────────────────────────────────────────────────────────
// WARRANTY EMAIL FUNCTIONS
// ─────────────────────────────────────────────────────────────

const WARRANTY_CLAIM_STATUS_LABELS = {
    pending: 'Chờ xử lý',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    completed: 'Hoàn thành',
};

const REASON_LABELS_MAP = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

function getWarrantyEmailTransporter() {
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const isSecurePort = smtpPort === 465;
    return nodemailer.createTransport({
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
}

/**
 * Gửi email xác nhận cho khách khi yêu cầu BH được tiếp nhận thành công.
 */
export const sendWarrantyClaimConfirmationEmail = async ({
    toEmail,
    customerName,
    warrantyCode,
    claimCode,
    productName,
    reason,
    createdAt,
}) => {
    const transporter = getWarrantyEmailTransporter();
    const safeName = escapeHtml(customerName || 'Quý khách');
    const safeCode = escapeHtml(warrantyCode);
    const safeClaimCode = escapeHtml(claimCode);
    const safeProduct = escapeHtml(productName || '—');
    const reasonLabel = REASON_LABELS_MAP[reason] || reason || '—';
    const dateStr = createdAt
        ? new Date(createdAt).toLocaleString('vi-VN', {
              dateStyle: 'dd/MM/yyyy',
              timeStyle: 'HH:mm',
          })
        : '—';

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: toEmail,
        subject: `Xác nhận tiếp nhận yêu cầu bảo hành — Mã ${claimCode} — Thanh Tú Store`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Yêu cầu bảo hành đã được tiếp nhận</h2>
                <p>Xin chào <strong>${safeName}</strong>,</p>
                <p>Yêu cầu bảo hành của bạn đã được tiếp nhận và đang chờ xử lý.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr>
                        <td style="padding: 8px 12px; background: #f0f9ff; border-radius: 6px;">
                            <span style="color: #0369a1; font-size: 13px;">Mã yêu cầu BH:</span><br/>
                            <strong style="font-size: 18px; color: #0c4a6e;">${safeClaimCode}</strong>
                        </td>
                    </tr>
                </table>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;"><strong>Mã bảo hành:</strong></td>
                        <td style="padding: 8px 0;">${safeCode}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;"><strong>Sản phẩm:</strong></td>
                        <td style="padding: 8px 0;">${safeProduct}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;"><strong>Lý do:</strong></td>
                        <td style="padding: 8px 0;">${escapeHtml(reasonLabel)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;"><strong>Ngày gửi:</strong></td>
                        <td style="padding: 8px 0;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;"><strong>Trạng thái:</strong></td>
                        <td style="padding: 8px 0;">
                            <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                                Chờ xử lý
                            </span>
                        </td>
                    </tr>
                </table>

                <p>Cửa hàng sẽ liên hệ với bạn trong thời gian sớm nhất để thông báo kết quả xử lý.</p>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                <p style="color: #666; font-size: 12px;">Mọi thắc mắc xin gọi: <strong>0386806456</strong></p>
                <p style="color: #666; font-size: 12px;">Thanh Tú Store</p>
            </div>
        `,
    });

    transporter.close?.();
};

/**
 * Gửi email thông báo cho khách khi trạng thái claim BH thay đổi.
 */
export const sendWarrantyClaimStatusUpdateEmail = async ({
    toEmail,
    customerName,
    warrantyCode,
    claimCode,
    productName,
    oldStatus,
    newStatus,
    resolutionNotes,
}) => {
    const transporter = getWarrantyEmailTransporter();
    const safeName = escapeHtml(customerName || 'Quý khách');
    const safeCode = escapeHtml(warrantyCode);
    const safeClaimCode = escapeHtml(claimCode);
    const safeProduct = escapeHtml(productName || '—');
    const newStatusLabel = WARRANTY_CLAIM_STATUS_LABELS[newStatus] || newStatus;
    const oldStatusLabel = WARRANTY_CLAIM_STATUS_LABELS[oldStatus] || oldStatus;
    const safeNotes = escapeHtml(resolutionNotes || '');

    const statusColors = {
        approved: { bg: '#dbeafe', text: '#1e40af', label: 'Đã duyệt' },
        rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Từ chối' },
        completed: { bg: '#d1fae5', text: '#065f46', label: 'Hoàn thành' },
    };
    const color = statusColors[newStatus] || { bg: '#f3f4f6', text: '#374151', label: newStatusLabel };

    let statusMessage = '';
    if (newStatus === 'approved') {
        statusMessage = 'Yêu cầu bảo hành của bạn đã được <strong>duyệt</strong>. Cửa hàng sẽ liên hệ để hướng dẫn bạn mang sản phẩm đến kiểm tra và xử lý.';
    } else if (newStatus === 'rejected') {
        statusMessage = 'Yêu cầu bảo hành của bạn đã bị <strong>từ chối</strong>. Vui lòng xem chi tiết bên dưới.';
    } else if (newStatus === 'completed') {
        statusMessage = 'Yêu cầu bảo hành của bạn đã được <strong>xử lý hoàn tất</strong>. Cảm ơn bạn đã tin tưởng Thanh Tú Store!';
    }

    await transporter.verify();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: toEmail,
        subject: `Cập nhật yêu cầu bảo hành — Mã ${claimCode} — Thanh Tú Store`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Cập nhật yêu cầu bảo hành</h2>
                <p>Xin chào <strong>${safeName}</strong>,</p>

                <div style="background: ${color.bg}; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0; color: ${color.text}; font-size: 15px;">
                        <strong>Trạng thái mới:</strong>
                        <span style="display: inline-block; margin-left: 8px; padding: 2px 12px; border-radius: 12px; background: ${color.bg}; border: 1px solid ${color.text}30; font-weight: 700;">
                            ${escapeHtml(color.label)}
                        </span>
                    </p>
                    <p style="margin: 8px 0 0; color: ${color.text}; font-size: 14px;">${statusMessage}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                    <tr>
                        <td style="padding: 6px 0; color: #64748b;"><strong>Mã yêu cầu:</strong></td>
                        <td style="padding: 6px 0; font-family: monospace; color: #0c4a6e;">${safeClaimCode}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b;"><strong>Mã bảo hành:</strong></td>
                        <td style="padding: 6px 0; font-family: monospace;">${safeCode}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b;"><strong>Sản phẩm:</strong></td>
                        <td style="padding: 6px 0;">${safeProduct}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b;"><strong>Trạng thái cũ:</strong></td>
                        <td style="padding: 6px 0;">${escapeHtml(oldStatusLabel)}</td>
                    </tr>
                </table>

                ${safeNotes ? `
                <div style="background: #f9fafb; border-left: 4px solid #d1d5db; padding: 12px; border-radius: 0 6px 6px 0; margin: 12px 0;">
                    <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;"><strong>Ghi chú từ cửa hàng:</strong></p>
                    <p style="margin: 0; font-size: 14px; color: #374151;">${safeNotes}</p>
                </div>
                ` : ''}

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                <p style="color: #666; font-size: 12px;">Mọi thắc mắc xin gọi: <strong>0386806456</strong></p>
                <p style="color: #666; font-size: 12px;">Thanh Tú Store</p>
            </div>
        `,
    });

    transporter.close?.();
};

// ─────────────────────────────────────────────────────────────
// ĐƠN HÀNG — thông báo đổi trạng thái / thanh toán
// ─────────────────────────────────────────────────────────────

function orderEmailFrontendBase() {
    return resolveFrontendBaseForLinks().replace(/\/$/, '');
}

const ORDER_STATUS_EMAIL_LABELS = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận (chờ xuất kho)',
    completed: 'Đã hoàn thành / đã xuất kho',
    cancelled: 'Đã hủy',
};

const ORDER_PAYMENT_EMAIL_LABELS = {
    pending: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền',
};

/**
 * Gửi email cho khách khi trạng thái đơn hoặc thanh toán thay đổi.
 * Lỗi SMTP chỉ ghi log — không ném ra ngoài.
 */
export const sendOrderStatusUpdateEmail = async ({
    toEmail,
    customerName,
    orderCode,
    orderId,
    prevStatus,
    newStatus,
    prevPaymentStatus,
    newPaymentStatus,
}) => {
    try {
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

        const safeName = escapeHtml(customerName || 'Quý khách');
        const safeCode = escapeHtml(orderCode || '—');
        const statusChanged = prevStatus !== newStatus;
        const payChanged = prevPaymentStatus !== newPaymentStatus;
        if (!statusChanged && !payChanged) {
            transporter.close?.();
            return;
        }

        const oldSL = ORDER_STATUS_EMAIL_LABELS[prevStatus] || prevStatus;
        const newSL = ORDER_STATUS_EMAIL_LABELS[newStatus] || newStatus;
        const oldPL = ORDER_PAYMENT_EMAIL_LABELS[prevPaymentStatus] || prevPaymentStatus;
        const newPL = ORDER_PAYMENT_EMAIL_LABELS[newPaymentStatus] || newPaymentStatus;

        let changeRows = '';
        if (statusChanged) {
            changeRows += `
                <tr>
                    <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Trạng thái đơn:</strong></td>
                    <td style="padding: 8px 0;">
                        <span style="color: #6b7280;">${escapeHtml(oldSL)}</span>
                        <span style="margin: 0 8px; color: #9ca3af;">→</span>
                        <strong style="color: #0c4a6e;">${escapeHtml(newSL)}</strong>
                    </td>
                </tr>`;
        }
        if (payChanged) {
            changeRows += `
                <tr>
                    <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Thanh toán:</strong></td>
                    <td style="padding: 8px 0;">
                        <span style="color: #6b7280;">${escapeHtml(oldPL)}</span>
                        <span style="margin: 0 8px; color: #9ca3af;">→</span>
                        <strong style="color: #0c4a6e;">${escapeHtml(newPL)}</strong>
                    </td>
                </tr>`;
        }

        const base = orderEmailFrontendBase();
        const oid = orderId ? String(orderId) : '';
        const detailPath = oid ? `${base}/orders/${oid}` : `${base}/orders`;
        const hrefAttr = detailPath.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        const safeDetailText = escapeHtml(detailPath);

        await transporter.verify();

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toEmail,
            subject: `Cập nhật đơn hàng ${orderCode || ''} — Thanh Tú Store`.trim(),
            html: `
            <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Cập nhật đơn hàng</h2>
                <p>Xin chào <strong>${safeName}</strong>,</p>
                <p>Đơn hàng <strong style="font-family: monospace;">${safeCode}</strong> của bạn vừa được cập nhật.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                    ${changeRows}
                </table>

                <p style="margin: 20px 0;">
                    <a href="${hrefAttr}" style="display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Xem chi tiết đơn hàng</a>
                </p>
                <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 12px; color: #444;">${safeDetailText}</p>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                <p style="color: #666; font-size: 12px;">Mọi thắc mắc xin gọi: <strong>0386806456</strong></p>
                <p style="color: #666; font-size: 12px;">Thanh Tú Store</p>
            </div>
            `,
        });

        transporter.close?.();
        console.log(`✅ Đã gửi email cập nhật đơn ${orderCode} tới ${toEmail}`);
    } catch (err) {
        console.error('❌ sendOrderStatusUpdateEmail:', err.message);
    }
};

