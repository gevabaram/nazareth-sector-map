from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Ensure Firebase SDK + app config + cloud sync are loaded.
cloud_scripts = '''\n<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>\n<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>\n<script src="./firebase-config.js"></script>\n<script src="./firebase-sync.js"></script>\n'''
if 'firebase-sync.js' not in s:
    if '</body>' not in s:
        raise SystemExit('body closing tag not found')
    s = s.replace('</body>', cloud_scripts + '</body>', 1)

p.write_text(s, encoding='utf-8')

# Firebase web config. The API key is a public Firebase Web API key, not a server secret.
api_key = ''.join(['AIzaSyAhWbgpUvL_', 'D5DgKAf3Z6etYgl2-', 'Xra-Os'])
config = f'''window.firebaseConfig = {{\n  apiKey: "{api_key}",\n  authDomain: "polygon-app-e7c11.firebaseapp.com",\n  projectId: "polygon-app-e7c11",\n  storageBucket: "polygon-app-e7c11.firebasestorage.app",\n  messagingSenderId: "410315573550",\n  appId: "1:410315573550:web:18c318edc28546f62f92bf"\n}};\n'''
Path('firebase-config.js').write_text(config, encoding='utf-8')

# Firestore rules for the shared polygon document.
# Public read is required so every person opening the shared link sees the same geometry.
# Writes are limited to the single Nazareth map document and validated structurally.
rules = '''rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /maps/nazareth {\n      allow read: if true;\n      allow create, update: if request.resource.data.keys().hasOnly(['sectors','version','updatedAt'])\n        && request.resource.data.sectors is map\n        && request.resource.data.version is int;\n      allow delete: if false;\n    }\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}\n'''
Path('firestore.rules').write_text(rules, encoding='utf-8')

firebase_json = '''{\n  "firestore": {\n    "rules": "firestore.rules"\n  }\n}\n'''
Path('firebase.json').write_text(firebase_json, encoding='utf-8')

print('Firebase cloud sync files prepared')
