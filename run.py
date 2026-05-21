import os
import sys
import subprocess
import http.server
import socketserver

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to virtual env python interpreter
    venv_python = os.path.join(current_dir, ".venv", "bin", "python")
    
    # 1. Run flight updater first
    print("📡 Updating live flight data...")
    if os.path.exists(venv_python):
        subprocess.run([venv_python, "update_flights.py"])
    else:
        subprocess.run([sys.executable, "update_flights.py"])

    # 2. Serve root folder on port 8080
    port = 8080
    os.chdir(current_dir)

    Handler = http.server.SimpleHTTPRequestHandler
    
    print(f"\n🚀 Launching Flight Tracker Dashboard Server...")
    print(f"✨ Serving the Radar Map & FIDS Board at: http://localhost:{port}")
    print("Press CTRL+C to stop the server.\n")

    try:
        with socketserver.TCPServer(("", port), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Flight Tracker server.")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
