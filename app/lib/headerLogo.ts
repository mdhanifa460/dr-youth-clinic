// The saved brand logo has the clinic name beneath the icon, on a large padded canvas.
// The header shows the icon alone, so it asks Cloudinary for just that region. The
// coordinates only fit this file, so any other uploaded logo is left exactly as it is.
const BRAND_LOGO_FILE = 'dr-youth-clinic/branding/iuuh9ypj8v4vel6l7kd1';
const ICON_CROP = 'c_crop,x_300,y_355,w_460,h_445';

export function toHeaderLogo(url: string): string {
  return url.includes(BRAND_LOGO_FILE) ? url.replace('/upload/', `/upload/${ICON_CROP}/`) : url;
}
