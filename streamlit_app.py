from pathlib import Path
import re
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="ABC Paints Dashboard", page_icon="🎨", layout="wide", initial_sidebar_state="collapsed")

ROOT = Path(__file__).parent
DIST = ROOT / "dist"

def dashboard_html():
    index_path = DIST / "index.html"
    if not index_path.exists():
        return "", "dist/index.html is missing"
    index = index_path.read_text(encoding="utf-8")
    css_match = re.search(r'href="/assets/([^"]+\.css)"', index)
    js_match = re.search(r'src="/assets/([^"]+\.js)"', index)
    if not css_match or not js_match:
        return "", "The dashboard asset names are missing from dist/index.html"
    css_path = DIST / "assets" / css_match.group(1)
    js_path = DIST / "assets" / js_match.group(1)
    missing = [str(p.relative_to(ROOT)) for p in (css_path, js_path) if not p.exists()]
    if missing:
        return "", "Missing dashboard build files: " + ", ".join(missing)
    css = css_path.read_text(encoding="utf-8")
    js = js_path.read_text(encoding="utf-8").replace("</script>", "<\\/script>")
    html = f'''<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body><div id="root"></div><script type="module">{js}</script></body></html>'''
    return html, ""

st.markdown("""<style>
      .stApp { background: #f1f5f9; }
      .block-container { max-width: 100%; padding: 0; }
      header[data-testid="stHeader"] { display:none; }
      iframe { border:0; }
    </style>""", unsafe_allow_html=True)

html, error = dashboard_html()
if error:
    st.error(error)
else:
    components.html(html, height=1400, scrolling=True)
