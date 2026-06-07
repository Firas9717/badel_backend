const { cloudinary, isConfigured } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Handle image upload to Cloudinary (if configured) or Local Storage (fallback)
 * @param {Object} file - The file object from multer (memoryStorage)
 * @param {string} folder - Folder name (e.g., 'profiles', 'offers')
 * @returns {Promise<Object>} - Object with secure_url and public_id
 */
async function uploadAudio(file, folder) {
  if (!file) return null;

  // 1. Magic Byte Validation (Strict Signature Check)
  const fileType = require('file-type');
  const typeInfo = await fileType.fromBuffer(file.buffer);
  if (!typeInfo || (!typeInfo.mime.startsWith('audio/') && !typeInfo.mime.startsWith('video/webm'))) {
    throw new Error('Invalid file content: The uploaded file is not a valid audio/webm file.');
  }

  // 2. Override spoofed mimetype with the real verified mimetype
  file.mimetype = typeInfo.mime;

  if (isConfigured) {
    const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `badel/${folder}`,
      resource_type: 'video' // Cloudinary uses 'video' for audio files
    });
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      storage: 'cloudinary'
    };
  } else {
    // Local Fallback
    const ext = file.mimetype.split('/')[1] || 'webm';
    const safeExt = ext === 'mpeg' ? 'mp3' : ext; // Handle audio/mpeg
    const fileName = `${uuidv4()}.${safeExt}`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', folder);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, fileName), file.buffer);
    return { secure_url: `/uploads/${folder}/${fileName}`, public_id: fileName, storage: 'local' };
  }
}

async function uploadImage(file, folder) {
  if (!file) return null;

  // 1. Magic Byte Validation (Strict Signature Check)
  const fileType = require('file-type');
  const typeInfo = await fileType.fromBuffer(file.buffer);
  if (!typeInfo || !typeInfo.mime.startsWith('image/')) {
    throw new Error('Invalid file content: The uploaded file is not a valid image despite its extension.');
  }

  // 2. Override spoofed mimetype with the real verified mimetype
  file.mimetype = typeInfo.mime;

  if (isConfigured) {
    const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `badel/${folder}`
    });
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      storage: 'cloudinary'
    };
  } else {
    // Local Fallback
    const ext = file.mimetype.split('/')[1] || 'jpg';
    const safeExt = ext === 'jpeg' ? 'jpg' : ext;
    const fileName = `${uuidv4()}.${safeExt}`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', folder);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, fileName), file.buffer);
    return { secure_url: `/uploads/${folder}/${fileName}`, public_id: fileName, storage: 'local' };
  }
}

/**
 * Delete image from storage
 * @param {string} publicId - Cloudinary public_id or local filename
 * @param {string} folder - Folder name if local
 * @param {string} storage - 'cloudinary' or 'local'
 */
async function deleteImage(publicId, folder, storageType = 'cloudinary') {
  if (!publicId) return;

  if (storageType === 'cloudinary' && isConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Error deleting from Cloudinary:', err.message);
    }
  } else if (storageType === 'local') {
    // Prevent path traversal by extracting only the filename
    const safeFilename = path.basename(publicId);
    const filePath = path.join(__dirname, '..', '..', 'uploads', folder, safeFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting local file:', err.message);
      }
    }
  }
}

module.exports = { uploadImage, uploadAudio, deleteImage };
