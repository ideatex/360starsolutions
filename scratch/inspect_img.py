from PIL import Image

src_path = r"C:/Users/annaa/.gemini/antigravity-ide/brain/c30fcd31-4137-4467-8fd0-7fcca443a759/.user_uploaded/media_1790258087304.png"
img = Image.open(src_path)
print("Image format:", img.format, "Mode:", img.mode, "Size:", img.size)

# The image is width x height. Let's see dimensions.
width, height = img.size
print(f"Dimensions: {width}x{height}")
