export const uploadToCloudinary = async (filePath) => {
  console.log(`Uploading file ${filePath} to Cloudinary...`);
  return { 
    secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 
    public_id: 'sample' 
  };
};

export const deleteFromCloudinary = async (publicId) => {
  console.log(`Deleting asset ${publicId} from Cloudinary...`);
  return { result: 'ok' };
};
