import sys
print("Python version:", sys.version)
try:
    import PIL
    from PIL import Image
    print("PIL is installed:", PIL.__version__)
except ImportError:
    print("PIL not installed")
