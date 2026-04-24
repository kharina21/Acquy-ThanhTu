/**
 * Script migrate warrantyYears / warrantyMonths từ warrantyText cũ.
 *
 * Chạy: node src/scripts/migrate-warranty-fields.js
 *
 * Logic:
 *   - warrantyText cũ → parse ra years + months
 *   - Gán vào warrantyYears + warrantyMonths
 *   - Schema pre-save hook sẽ tự sinh lại warrantyText chuẩn
 *
 * CHẠY THỬ TRƯỚC với DRY_RUN=true:
 *   DRY_RUN=true node src/scripts/migrate-warranty-fields.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// ── Parse warrantyText cũ thành years + months ─────────────────────────────
function parseOldWarrantyText(text) {
    if (!text || typeof text !== 'string') return { years: 0, months: 0 };

    const t = text.trim().toLowerCase();
    let years = 0;
    let months = 0;

    // Tìm năm: "1 năm", "1year", "1nam", "1 y"
    const yearMatch = t.match(/(\d+)\s*(?:năm|year|y|nam)/);
    if (yearMatch) years = parseInt(yearMatch[1], 10) || 0;

    // Tìm tháng: "6 tháng", "6month", "6thang", "6th"
    const monthMatch = t.match(/(\d+)\s*(?:tháng|month|thang|th)/);
    if (monthMatch) months = parseInt(monthMatch[1], 10) || 0;

    // Nếu không match gì mà chỉ là số thuần → coi là tháng
    if (years === 0 && months === 0) {
        const numOnly = /^(\d+)$/.exec(t);
        if (numOnly) months = parseInt(numOnly[1], 10) || 0;
    }

    // Clamp
    years = Math.max(0, Math.min(99, years || 0));
    months = Math.max(0, Math.min(11, months || 0));

    return { years, months };
}

// ── Connect ───────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('❌ Thiếu MONGO_URI trong .env');
    process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN !== 'false'; // default TRUE (an toàn)
const SCHEMA_PATH = '../models/Product.js';

await mongoose.connect(MONGO_URI);
console.log(`✅ Connected to MongoDB`);
console.log(`📦 DRY_RUN: ${DRY_RUN ? 'ON (không ghi dữ liệu)' : 'OFF (sẽ ghi dữ liệu)'}`);
console.log('');

// ── Import schema sau khi connect ───────────────────────────────────────────
const Product = (await import(SCHEMA_PATH)).default;

// ── Tìm tất cả sản phẩm có warrantyText nhưng warrantyYears = 0 ────────────
const query = {
    isDeleted: false,
    warrantyText: { $ne: '' },
    $or: [
        { warrantyYears: { $exists: false } },
        { warrantyYears: 0, warrantyMonths: { $exists: false } },
        { warrantyYears: 0, warrantyMonths: 0 },
    ],
};

const products = await Product.find(query).lean();
console.log(`🔍 Tìm thấy ${products.length} sản phẩm cần migrate\n`);

if (products.length === 0) {
    console.log('✅ Không có sản phẩm nào cần migrate. Thoát.');
    await mongoose.disconnect();
    process.exit(0);
}

// ── Preview ───────────────────────────────────────────────────────────────────
console.log('─── Preview (trước → sau) ───────────────────────────────────');
for (const p of products) {
    const { years, months } = parseOldWarrantyText(p.warrantyText);
    const newWarrantyText =
        years === 0 && months === 0
            ? ''
            : years === 0
              ? `${months} Tháng`
              : months === 0
                ? `${years} Năm`
                : `${years} Năm ${months} Tháng`;

    console.log(
        `  "${p.name}"`,
        `\n    warrantyText cũ: "${p.warrantyText}"`,
        `\n    → years=${years}, months=${months} → "${newWarrantyText}"`,
    );
}
console.log('');

// ── Execute ────────────────────────────────────────────────────────────────────
if (DRY_RUN) {
    console.log('🟡 DRY_RUN = true → Bỏ qua ghi dữ liệu.');
    console.log('   Muốn ghi thật? Chạy: DRY_RUN=false node src/scripts/migrate-warranty-fields.js');
} else {
    console.log('🟢 Bắt đầu migrate...');
    let updated = 0;
    let skipped = 0;

    for (const p of products) {
        const { years, months } = parseOldWarrantyText(p.warrantyText);

        try {
            await Product.findByIdAndUpdate(p._id, {
                warrantyYears: years,
                warrantyMonths: months,
                // warrantyText sẽ được schema pre-save hook tự sinh lại
            });
            updated++;
            console.log(`  ✅ ${p.name}: years=${years}, months=${months}`);
        } catch (err) {
            skipped++;
            console.error(`  ❌ Lỗi khi migrate "${p.name}": ${err.message}`);
        }
    }

    console.log(`\n✅ Hoàn tất: ${updated} sản phẩm đã update, ${skipped} lỗi.`);
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected.');
