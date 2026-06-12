import os
import shutil

src_dir = "/home/ubuntu/Desktop/PURE AI WEBSITE MAINTANACE/Final Pure AI Website1/Final Pure AI Website/pure ai"
dest_dir = "/home/ubuntu/Desktop/pure ai website edited version"
zip_base = "/home/ubuntu/Desktop/pure ai website edited version"

print(f"Source directory: {src_dir}")
print(f"Destination directory: {dest_dir}")

# Remove destination directory if it already exists to avoid errors
if os.path.exists(dest_dir):
    print("Destination directory already exists, removing it first...")
    shutil.rmtree(dest_dir)

# Copy directory
print("Copying directory to Desktop...")
shutil.copytree(src_dir, dest_dir)
print("Directory copied successfully.")

# Create clean ZIP file
print("Creating ZIP archive on Desktop...")
shutil.make_archive(zip_base, 'zip', root_dir="/home/ubuntu/Desktop", base_dir="pure ai website edited version")
print("ZIP archive created successfully.")
