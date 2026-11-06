// The saved logo has wide empty margins built into the image, so at header size the
// artwork itself came out tiny. Cloudinary's e_trim cuts those margins at delivery,
// leaving the upload and Admin untouched. Logos hosted elsewhere display as they are.
export function toHeaderLogo(url: string): string {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || url.includes('/e_trim')) return url;
  return url.replace('/image/upload/', '/image/upload/e_trim/');
}
