from PIL import Image

src_path = r"C:/Users/annaa/.gemini/antigravity-ide/brain/c30fcd31-4137-4467-8fd0-7fcca443a759/.user_uploaded/media_1790258087304.png"
img = Image.open(src_path)

# Let's crop centered square: height is 439.
h = 439
center_x = 1024 // 2
box = (center_x - h // 2, 0, center_x + h // 2, h)
cropped = img.crop(box)
print("Cropped size:", cropped.size)
cropped.save("scratch/cropped_preview.png")
