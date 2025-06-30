// src/services/cloudinary.js

// Función para subir imágenes (versión nombrada)
export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'marketplace');
  formData.append('cloud_name', 'dsfnladar');

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/dsfnladar/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log('Imagen subida exitosamente:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error subiendo la imagen:', error);
    throw error;
  }
};

// Función para eliminar imágenes (versión nombrada)
export const deleteImageFromCloudinary = async (publicId) => {
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/dsfnladar/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId, // Aquí usamos el parámetro publicId
        api_key: '949681764298537',
        api_secret: 's-fpq822vCf2MWKlK1y48-HDeks',
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });
    const data = await response.json();
    console.log('Imagen eliminada exitosamente:', data);
    return data;
  } catch (error) {
    console.error('Error eliminando la imagen:', error);
    throw error;
  }
};

// Exportación por defecto para compatibilidad (opcional)
export default {
  uploadImage: uploadImageToCloudinary,
  deleteImage: deleteImageFromCloudinary,
};