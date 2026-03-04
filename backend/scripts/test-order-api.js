/**
 * Script test API Order – chạy khi backend đang chạy (port 5000)
 * Usage: node scripts/test-order-api.js [username] [password]
 * Mặc định thử: admin/123456, admin/admin
 */
const BASE = 'http://localhost:5000/api';

async function request(method, path, body = null, token = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function main() {
    const [username = 'testorder', password = '123456'] = process.argv.slice(2);
    let token = null;

    console.log('\n=== Test Order API ===\n');

    // 1. Login (hoặc đăng ký nếu chưa có user)
    console.log('1. Login...');
    let loginRes = await request('POST', '/auth/login', { username, password });
    if (loginRes.status !== 200 || !loginRes.data?.accessToken) {
        console.log('   Đăng ký user mới...');
        const regRes = await request('POST', '/auth/register-user', {
            username,
            password,
            email: `${username}@test.local`,
            firstName: 'Test',
            lastName: 'Order',
        });
        if (regRes.status !== 201) {
            console.log('   ❌ Đăng ký thất bại:', regRes.data?.message);
            console.log('   Thử: node scripts/test-order-api.js <username> <password>');
            process.exit(1);
        }
        loginRes = await request('POST', '/auth/login', { username, password });
    }
    if (loginRes.status !== 200 || !loginRes.data?.accessToken) {
        console.log('   ❌ Login thất bại:', loginRes.data?.message);
        process.exit(1);
    }
    token = loginRes.data.accessToken;
    console.log('   ✅ Login OK');

    // 2. GET /api/locations/active
    console.log('\n2. GET /api/locations/active...');
    const locRes = await request('GET', '/locations/active', null, token);
    if (locRes.status !== 200) {
        console.log('   ❌ Lỗi:', locRes.data?.message || locRes.status);
    } else {
        const locations = locRes.data?.data?.locations || [];
        console.log('   ✅ OK – Số chi nhánh:', locations.length);
        if (locations.length > 0) {
            console.log('   Chi nhánh đầu:', locations[0].name, '(' + locations[0]._id + ')');
        }
    }

    // 3. GET /api/cart và thêm sản phẩm nếu trống
    console.log('\n3. GET /api/cart...');
    let cartRes = await request('GET', '/cart', null, token);
    if (cartRes.status !== 200) {
        console.log('   ❌ Lỗi:', cartRes.data?.message);
    } else {
        let items = cartRes.data?.data?.items || [];
        if (items.length === 0) {
            console.log('   Giỏ trống – thêm sản phẩm...');
            const prodsRes = await request('GET', '/products?page=1&limit=5', null, null);
            const products = prodsRes.data?.data?.products || prodsRes.data?.products || [];
            if (products.length > 0) {
                const addRes = await request(
                    'POST',
                    '/cart/items',
                    { productId: products[0]._id, quantity: 1 },
                    token
                );
                if (addRes.status === 200) {
                    cartRes = addRes;
                    items = addRes.data?.data?.items || [];
                    console.log('   ✅ Đã thêm sản phẩm:', products[0].name);
                }
            }
        }
        console.log('   ✅ Số sản phẩm trong giỏ:', items.length);
    }

    // 4. GET /api/orders
    console.log('\n4. GET /api/orders...');
    const ordersRes = await request('GET', '/orders', null, token);
    if (ordersRes.status !== 200) {
        console.log('   ❌ Lỗi:', ordersRes.data?.message || ordersRes.status);
    } else {
        const orders = ordersRes.data?.data?.orders || [];
        console.log('   ✅ OK – Số đơn hàng:', orders.length);
    }

    // 5. POST /api/orders (nếu có giỏ và location)
    const items = cartRes?.data?.data?.items || [];
    const locations = locRes?.data?.data?.locations || [];
    let orderId = null;
    if (items.length > 0 && locations.length > 0) {
        console.log('\n5. POST /api/orders (tạo đơn từ giỏ)...');
        const createRes = await request(
            'POST',
            '/orders',
            {
                locationId: locations[0]._id,
                paymentMethod: 'transfer',
                shippingAddress: '123 Đường Test',
                note: 'Đơn test',
            },
            token
        );
        if (createRes.status === 201) {
            orderId = createRes.data?.data?.order?._id;
            console.log('   ✅ Đặt hàng thành công!');
            console.log('   Mã đơn:', createRes.data?.data?.order?.code);
        } else {
            console.log('   ❌ Lỗi:', createRes.data?.message || createRes.data);
        }
    } else {
        console.log('\n5. Bỏ qua POST /api/orders (giỏ trống hoặc chưa có location)');
    }

    // 6. GET /api/orders/:id (nếu vừa tạo đơn)
    if (orderId) {
        console.log('\n6. GET /api/orders/:id (chi tiết đơn)...');
        const detailRes = await request('GET', `/orders/${orderId}`, null, token);
        if (detailRes.status === 200) {
            const o = detailRes.data?.data?.order;
            console.log('   ✅ OK – Mã:', o?.code, '| Tổng:', o?.totalAmount?.toLocaleString?.(), 'đ');
        } else {
            console.log('   ❌ Lỗi:', detailRes.data?.message);
        }
    }

    console.log('\n=== Kết thúc test ===\n');
}

main().catch((e) => {
    console.error('Lỗi:', e.message);
    process.exit(1);
});
