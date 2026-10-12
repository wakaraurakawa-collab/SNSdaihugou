import os
ROOT = os.path.dirname(os.path.abspath(__file__))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
parts = ['src/engine.js', 'src/dynasty.js', 'src/js/10-util.js', 'src/js/20-svg.js', 'src/js/22-avatar.js', 'src/js/23-posts.js', 'src/js/24-content.js',
         'src/js/25-paint.js', 'src/js/26-fanicon.js', 'src/js/30-layout.js', 'src/js/35-cards.js', 'src/js/37-desk.js', 'src/js/38-notify.js', 'src/js/39-pressure.js', 'src/js/40-ui.js', 'src/js/50-flow.js', 'src/js/60-boot.js']
js = "\n".join(rd(p) for p in parts)
page = rd('src/page.html').replace('/*__SCRIPT__*/', js)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist/sns-daifugo.html'), 'w', encoding='utf-8').write(page)
wrapped = ('<!doctype html><html lang="ja"><head><meta charset="utf-8">'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + page + '</body></html>')
open(os.path.join(ROOT, 'test/index.html'), 'w', encoding='utf-8').write(wrapped)
open(os.path.join(ROOT, 'test/_bundle.mjs'), 'w', encoding='utf-8').write(js)
print('built', len(page.encode('utf-8')), 'bytes')
