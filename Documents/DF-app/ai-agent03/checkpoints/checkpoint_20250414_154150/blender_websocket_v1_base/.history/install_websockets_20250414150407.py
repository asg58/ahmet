import subprocess
import sys
import os

def install_websockets():
    # Get the path to the Python executable Blender is using
    python_exe = sys.executable
    
    print(f"Using Python: {python_exe}")
    
    # Install websockets using pip
    try:
        # First try using pip module
        print("Attempting to install websockets...")
        subprocess.check_call([python_exe, "-m", "pip", "install", "websockets"])
        print("Successfully installed websockets!")
    except subprocess.CalledProcessError:
        print("Failed to install using pip module. Trying alternative method...")
        try:
            # Try getting pip's path and using it directly
            pip_path = os.path.join(os.path.dirname(python_exe), "pip")
            if sys.platform == "win32":
                pip_path += ".exe"
                
            if os.path.exists(pip_path):
                subprocess.check_call([pip_path, "install", "websockets"])
                print("Successfully installed websockets using pip executable!")
            else:
                print(f"Could not find pip at {pip_path}")
                print("Please install websockets manually using:")
                print(f"{python_exe} -m pip install websockets")
        except Exception as e:
            print(f"Error during installation: {e}")
            print("Please install websockets manually.")

if __name__ == "__main__":
    install_websockets() 