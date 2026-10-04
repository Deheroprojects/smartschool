"""Start the built app and open it in the default browser."""
from pathlib import Path
import threading
import time
from urllib.request import urlopen
import webbrowser

import uvicorn


def open_when_ready():
    for _ in range(100):
        try:
            with urlopen("http://127.0.0.1:8000/api/health", timeout=1) as response:
                if response.status == 200:
                    webbrowser.open("http://127.0.0.1:8000")
                    return
        except OSError:
            time.sleep(0.2)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    if not (root / "dist" / "index.html").exists():
        raise SystemExit("Build the interface first with: npm.cmd run build")
    print("\nSmartSchool is starting at http://127.0.0.1:8000\nClick Open presentation demo in the browser.\nKeep this window open. Press Ctrl+C to stop.\n")
    threading.Thread(target=open_when_ready, daemon=True).start()
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000)
