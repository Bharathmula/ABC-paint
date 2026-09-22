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
        return ""
    index = index_path.read_text(encoding="utf-8")
    css_match = re.search(r'href="/assets/([^"]+\.css)"', index)
    js_match = re.search(r'src="/assets/([^"]+\.js)"', index)
    if not css_match or not js_match:
        return ""
    css = (DIST / "assets" / css_match.group(1)).read_text(encoding="utf-8")
    js = (DIST / "assets" / js_match.group(1)).read_text(encoding="utf-8").replace("</script>", "<\\/script>")
    return f"""<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body><div id="root"></div><script type="module">{js}</script></body></html>"""

html = dashboard_html()
if not html:
    st.error("Dashboard build is missing. Run `npm install --legacy-peer-deps` and `npm run build`, then restart Streamlit.")
else:
    st.markdown("""<style>
      .stApp { background: #f1f5f9; }
      .block-container { max-width: 100%; padding: 0; }
      header[data-testid="stHeader"] { display:none; }
      iframe { border:0; }
    </style>""", unsafe_allow_html=True)
    components.html(html, height=1400, scrolling=True)
