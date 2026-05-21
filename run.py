import os
import sys
import subprocess

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to virtual env python interpreter
    venv_python = os.path.join(current_dir, ".venv", "bin", "python")
    
    if not os.path.exists(venv_python):
        print(f"Virtual environment not found at {venv_python}.")
        print("Please set up the virtual environment by running:")
        print("  python3 -m venv .venv")
        print("  .venv/bin/pip install -r requirements.txt")
        sys.exit(1)
        
    print(f"🚀 Launching AeroParse Server using: {venv_python}")
    print("✨ Serving the Interactive Map Playground at: http://localhost:8000")
    print("✨ Serving the GraphQL Explorer at: http://localhost:8000/graphql")
    print("Press CTRL+C to stop the server.\n")
    
    cmd = [
        venv_python, 
        "-m", 
        "uvicorn", 
        "server.app:app", 
        "--host", "127.0.0.1", 
        "--port", "8000", 
        "--reload"
    ]
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nStopping AeroParse server.")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
