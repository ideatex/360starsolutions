import os
from PIL import Image

src_path = r"C:/Users/annaa/.gemini/antigravity-ide/brain/c30fcd31-4137-4467-8fd0-7fcca443a759/.user_uploaded/media_1790258087304.png"
img = Image.open(src_path)

# Crop centered square
w, h = img.size
center_x = w // 2
crop_box = (center_x - h // 2, 0, center_x + h // 2, h)
square_img = img.crop(crop_box).convert("RGBA")

target_dirs = [
    r"c:\Users\annaa\Downloads\360 Star Solutions (2)\360 Star Solutions\public",
    r"c:\Users\annaa\Downloads\360 Star Solutions (2)\360 Star Solutions\src\client\public",
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)
    
    # 1. favicon-96x96.png
    f96 = square_img.resize((96, 96), Image.Resampling.LANCZOS)
    f96.save(os.path.join(d, "favicon-96x96.png"), format="PNG")
    
    # 2. apple-touch-icon.png (180x180)
    f180 = square_img.resize((180, 180), Image.Resampling.LANCZOS)
    f180.save(os.path.join(d, "apple-touch-icon.png"), format="PNG")
    
    # 3. web-app-manifest-192x192.png
    f192 = square_img.resize((192, 192), Image.Resampling.LANCZOS)
    f192.save(os.path.join(d, "web-app-manifest-192x192.png"), format="PNG")
    
    # 4. web-app-manifest-512x512.png
    f512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    f512.save(os.path.join(d, "web-app-manifest-512x512.png"), format="PNG")
    
    # 5. favicon.ico (multi-resolution 16x16, 32x32, 48x48)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    square_img.save(os.path.join(d, "favicon.ico"), format="ICO", sizes=ico_sizes)
    
    # 6. site.webmanifest
    manifest_content = """{
  "name": "360 Star Solutions",
  "short_name": "360 Star",
  "icons": [
    {
      "src": "/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#0284c7",
  "background_color": "#0b0f19",
  "display": "standalone"
}
"""
    with open(os.path.join(d, "site.webmanifest"), "w", encoding="utf-8") as mf:
        mf.write(manifest_content)

print("Favicon files generated successfully in all target directories!")
