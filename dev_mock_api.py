#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse as urlparse
from datetime import datetime

SUBJECTS = ["van", "ktpl", "lich-su"]

PUBLICATIONS_BY_SUBJECT = {
    "van": [
        {"id": 2, "title": "Van: Bài 2", "created_at": "2026-03-01T12:00:00Z", "image_url": ""},
        {"id": 3, "title": "Van: Bài 3", "created_at": "2026-02-14T09:30:00Z", "image_url": ""},
        {"id": 4, "title": "Van: Bài 4", "created_at": "2026-01-10T08:00:00Z", "image_url": ""},
        {"id": 10, "title": "Cuộc thi Văn: Danh sách giải", "created_at": "2026-04-01T08:00:00Z", "image_url": "", "content_type": "cuoc-thi"},
    ],
    "ktpl": [
        {"id": 5, "title": "KTPL: Bài 5", "created_at": "2026-03-05T10:00:00Z", "image_url": ""},
    ],
}

MAIN_PUBLICATION = {
    "id": 1,
    "title": "Bài mẫu 1",
    "created_at": "2026-04-01T12:00:00Z",
    "content_type": "an-pham",
    "subject": "van",
    # layout_metadata is a serialized CMSDocument expected by the frontend
    "layout_metadata": json.dumps({
        "version": 1,
        "id": "doc-1",
        "type": "article",
        "title": "Bài mẫu 1",
        "blocks": [
            {"id": "p1", "type": "paragraph", "props": {"colSpan": 12, "text": "Đoạn mô tả demo"}, "children": []},
            {"id": "rp1", "type": "related-posts", "props": {"colSpan": 12, "title": "Bài liên quan", "count": 3, "category": ""}, "children": []}
        ],
        "metadata": {}
    }),
}


class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse.urlparse(self.path)
        path = parsed.path
        qs = urlparse.parse_qs(parsed.query)

        if path == '/api/public/subjects':
            self._set_headers()
            self.wfile.write(json.dumps(SUBJECTS).encode('utf-8'))
            return

        if path == '/api/public/publications':
            # Query by subject
            subject = (qs.get('subject') or [''])[0]
            if subject:
                items = PUBLICATIONS_BY_SUBJECT.get(subject, [])
                self._set_headers()
                self.wfile.write(json.dumps(items).encode('utf-8'))
                return
            # No subject -> return empty
            self._set_headers()
            self.wfile.write(json.dumps([]).encode('utf-8'))
            return

        if path.startswith('/api/public/publications/'):
            # /api/public/publications/<id>
            pid = path.rsplit('/', 1)[-1]
            if pid == '1' or pid == str(MAIN_PUBLICATION['id']):
                self._set_headers()
                self.wfile.write(json.dumps(MAIN_PUBLICATION).encode('utf-8'))
                return
            # find in subjects
            for subs in PUBLICATIONS_BY_SUBJECT.values():
                for p in subs:
                    if str(p.get('id')) == pid:
                        self._set_headers()
                        self.wfile.write(json.dumps(p).encode('utf-8'))
                        return
            # not found
            self._set_headers(404)
            self.wfile.write(json.dumps({}).encode('utf-8'))
            return

        # default
        self._set_headers(200, 'text/plain')
        self.wfile.write(b"Mock API running")


def run(server_class=HTTPServer, handler_class=Handler, port=3002):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Mock API listening on http://0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down mock API')
        httpd.server_close()


if __name__ == '__main__':
    run()
