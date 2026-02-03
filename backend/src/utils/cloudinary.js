import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

/**
 * Cấu hình Cloudinary từ biến môi trường.
 * Cần: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function uploadImageFromBuffer(buffer, mimeType, folder = 'products') {
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
    });

    return { url: result.secure_url, public_id: result.public_id };
}

export default cloudinary;
