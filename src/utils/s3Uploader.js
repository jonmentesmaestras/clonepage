/**
 * Utility to upload HTML content to the backend S3 endpoint.
 * @param {string} html - The cleaned HTML string to persist.
 * @returns {Promise<Response>}
 */
export const uploadHtmlToS3 = async (html) => {
  const payload = {
    bucket_name: "pulpo-landing-demo-9c9676",

    key: "index.html",
    html: html
  };

  try {
    const response = await fetch('http://127.0.0.1:5000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload to S3');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in uploadHtmlToS3:', error);
    throw error;
  }
};
