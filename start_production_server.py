# -*- coding: utf-8 -*-
"""
Production Web Server - SCADA Predictive Management System
Serves the web application on 0.0.0.0:8088 for full network access.
"""

import http.server
import socketserver
import os

PORT = 8088
DIRECTORY = r'C:\Users\Lenovo\.gemini\antigravity\scratch\predictive-scada-app'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers for production UI assets
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"[SCADA Production Server] Live on http://0.0.0.0:{PORT}")
        print(f"[LAN Access URL] http://192.168.1.209:{PORT}")
        print(f"[Local Access URL] http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[SCADA Production Server] Server stopped gracefully.")
