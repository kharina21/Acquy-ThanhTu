// backend/src/UTest/memberPolicyController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    memberPolicyMock
} = vi.hoisted(() => {
    // SHARED STATE (Trạng thái dùng chung để điều khiển kịch bản)
    const state = {
        dbError: false,
        policyExists: true,
        duplicateCodeExists: false, // Bật lên khi test UTCID04
    };

    return {
        testState: state,
        memberPolicyMock: {
            findById: vi.fn(async (id) => {
                // Kịch bản: Lỗi Database (UTCID06)
                if (state.dbError) throw new Error('DB Error');
                
                // Kịch bản: Không tìm thấy ID (UTCID02)
                if (!state.policyExists || id === 'not-found') return null;

                // Trả về mock document hợp lệ (Có kèm hàm save)
                return {
                    _id: id,
                    name: 'Silver',
                    code: 'SILVER',
                    description: 'Hạng Bạc',
                    minTotalSpent: 1000000,
                    discountPercent: 5,
                    isActive: true,
                    save: vi.fn().mockResolvedValue(true)
                };
            }),
            findOne: vi.fn(async (query) => {
                // Kịch bản: Lỗi Database
                if (state.dbError) throw new Error('DB Error');
                
                // Kịch bản: Bị trùng mã Code "GOLD" (UTCID04)
                if (state.duplicateCodeExists && query.code === 'GOLD') {
                    // Trả về một object giả đại diện cho Policy khác đang giữ mã GOLD
                    return { _id: 'other_policy_id', code: 'GOLD' };
                }
                return null;
            })
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
// Giả định model của bạn nằm ở thư mục models
vi.mock('../models/MemberPolicy.js', () => ({ default: memberPolicyMock }));

// Import controller
import { updateMemberPolicy } from '../controllers/memberPolicyController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('memberPolicyController - updateMemberPolicy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái về Normal trước mỗi test case
        testState.dbError = false;
        testState.policyExists = true;
        testState.duplicateCodeExists = false;
    });

    it('UTCID01: Should update successfully with valid data (Normal)', async () => {
        const req = { 
            params: { id: 'pol1' },
            body: { name: 'Gold', code: 'NEWGOLD', discountPercent: 10 }
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Cập nhật hạng thành viên thành công" 
        }));
    });

    it('UTCID02: Should return 404 when ID is "not-found" (Abnormal)', async () => {
        testState.policyExists = false;
        const req = { 
            params: { id: 'not-found' },
            body: { name: 'Gold' }
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không tìm thấy hạng thành viên" 
        }));
    });

    it('UTCID03: Should return 400 when name is empty or spaces (Abnormal)', async () => {
        const req = { 
            params: { id: 'pol1' },
            body: { name: '   ' } // Tên rỗng / toàn dấu cách
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Tên hạng không được để trống" 
        }));
    });

    it('UTCID04: Should return 400 when code is duplicated (Abnormal)', async () => {
        testState.duplicateCodeExists = true; // Kích hoạt có hạng "GOLD" tồn tại ở DB
        const req = { 
            params: { id: 'pol1' },
            body: { code: 'GOLD' }
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Mã hạng đã tồn tại" 
        }));
    });

    it('UTCID05: Should return 400 when discountPercent is > 100 (Abnormal)', async () => {
        const req = { 
            params: { id: 'pol1' },
            body: { discountPercent: 150 } // Giá trị > 100
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Phần trăm giảm giá phải từ 0 đến 100" 
        }));
    });

    it('UTCID06: Should return 500 on database execution error (Abnormal)', async () => {
        testState.dbError = true; // Kích hoạt lỗi DB
        const req = { 
            params: { id: 'pol1' },
            body: { name: 'Gold' } 
        };
        const res = createMockRes();

        await updateMemberPolicy(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi cập nhật hạng thành viên" 
        }));
    });
});