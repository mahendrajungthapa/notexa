/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://app.notexa.cloud/api',
  },
  images: {
    unoptimized: true,
  },
};
