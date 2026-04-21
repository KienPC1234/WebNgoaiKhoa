#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
import os
from datetime import datetime

PORT = int(os.environ.get('MOCK_PORT', '5174'))
DIST_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/public/publications'):
            qs = urllib.parse.parse_qs(parsed.query)
            subject = qs.get('subject', [''])[0]
            # return sample list
            now = datetime.utcnow().isoformat() + 'Z'
            sample = [
                { 'id': 101, 'title': f'Sample {subject} A', 'subject': subject, 'category': subject, 'image_url': '', 'created_at': now },
                { 'id': 102, 'title': f'Sample {subject} B', 'subject': subject, 'category': subject, 'image_url': '', 'created_at': now },
                { 'id': 103, 'title': f'Sample {subject} C', 'subject': subject, 'category': subject, 'image_url': '', 'created_at': now },
            ]r
            body = json.dumps(sample).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Serve static files from dist
        self.directory = DIST_DIR
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(DIST_DIR)
    try:
        with socketserver.TCPServer(('', PORT), Handler) as httpd:
            print(f"Serving dist at http://localhost:{PORT}")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print('Shutting down')
                httpd.server_close()
    except OSError as e:
        print(f"Failed to bind to port {PORT}: {e}")
