export const getUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.status(200).json({ message: 'Lấy user thành công.', user });
    } catch (error) {
        console.log('Lỗi khi gọi getUser:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống.', error: error.message });
    }
};
