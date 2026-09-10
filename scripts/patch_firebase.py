from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'firebase-sync.js' in s:
    print('Firebase loader already present')
    raise SystemExit(0)
insert='''\n<script src="https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js"></script>\n<script src="https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore-compat.js"></script>\n<script src="./firebase-config.js"></script>\n<script src="./firebase-sync.js"></script>\n'''
if '</body>' not in s:
    raise SystemExit('body end not found')
s=s.replace('</body>',insert+'</body>',1)
p.write_text(s,encoding='utf-8')
print('Firebase loader inserted')
