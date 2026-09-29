# Generates .working/color-themes-1.html — 5 themes x light/dark, KF-1 dashboard snippet.
out = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/color-themes-1.html"

# status tokens shared across themes (Apple-system-derived, tuned for >=4.5:1 text contrast)
STATUS = {
  "light": dict(done="#1F7A35", waiting="#A04A00", blocked="#C4001A", decision="#7D3C98", obsolete="#8E8E93"),
  "dark":  dict(done="#30D158", waiting="#FF9F0A", blocked="#FF6961", decision="#D08CF2", obsolete="#8E8E93"),
}
THEMES = [
  ("A · Clear Sky", "Familiar and trustworthy — the closest to stock Apple. Blue says 'this is a tool you already know'.",
   dict(bg="#F5F5F7", card="#FFFFFF", text="#1D1D1F", muted="#6E6E73", line="#E5E5EA", accent="#0066CC", accentSoft="#E8F1FB"),
   dict(bg="#000000", card="#1C1C1E", text="#F5F5F7", muted="#98989D", line="#38383A", accent="#4DA3FF", accentSoft="#0B2A4A")),
  ("B · Sage", "Calm and restorative — a quiet green that reads as 'things are under control'. Most literally 'weight off your shoulders'.",
   dict(bg="#F6F7F4", card="#FFFFFF", text="#1C211D", muted="#687068", line="#E3E6E0", accent="#3D7A57", accentSoft="#E7F1EA"),
   dict(bg="#0E110F", card="#1B201C", text="#EEF2EE", muted="#9AA39B", line="#323A34", accent="#7CC49A", accentSoft="#1C3326")),
  ("C · Dusk Indigo", "Thoughtful with a hint of evening celebration. Still calm, but with more personality than blue.",
   dict(bg="#F5F5FA", card="#FFFFFF", text="#1C1C28", muted="#6B6B7B", line="#E4E4EE", accent="#4F46E5", accentSoft="#ECEBFC"),
   dict(bg="#0B0B12", card="#1B1B26", text="#F2F2F8", muted="#9C9CB0", line="#34344A", accent="#9C97FF", accentSoft="#25234A")),
  ("D · Warm Sand", "Hospitable and human — warm paper and terracotta. Feels like an invitation more than an app.",
   dict(bg="#FAF7F2", card="#FFFFFF", text="#231F1A", muted="#75695C", line="#EDE6DB", accent="#A8502A", accentSoft="#F8EAE2"),
   dict(bg="#12100D", card="#211D18", text="#F4EFE8", muted="#A89C8E", line="#3A332B", accent="#EE9468", accentSoft="#3A2418")),
  ("E · Graphite", "Near-monochrome. The UI steps back entirely; only statuses carry colour. Most minimal, most 'pro'.",
   dict(bg="#F5F5F7", card="#FFFFFF", text="#1D1D1F", muted="#6E6E73", line="#E5E5EA", accent="#1D1D1F", accentSoft="#EDEDF0"),
   dict(bg="#000000", card="#1C1C1E", text="#F5F5F7", muted="#98989D", line="#38383A", accent="#F5F5F7", accentSoft="#2C2C2E")),
]

def panel(mode, c):
    s = STATUS[mode]
    v = ";".join(f"--{k}:{val}" for k, val in {**c, **s}.items())
    chips = "".join(f'<span class="chip"><i style="background:var(--{k})"></i>{k}</span>' for k in
                    ["bg","card","text","muted","accent","done","waiting","blocked","decision","obsolete"])
    return f'''<div class="panel" style="{v}">
  <div class="mode">{mode}</div>
  <div class="chips">{chips}</div>
  <div class="app">
    <div class="ev"><div><div class="evt">Lucas's 40th</div><div class="sub">Sat 24 Oct · 80 invited · 26 days to go</div></div><button class="btn">+ New task</button></div>
    <div class="card"><div class="row"><span class="dot" style="background:var(--done)">✓</span><b>Venue</b><span class="st" style="color:var(--done)">Booked</span><span class="who">Stine</span></div></div>
    <div class="card"><div class="row"><span class="dot" style="background:var(--accent)">👥</span><b>Guests</b><span class="who">80 invited</span></div>
      <div class="bar"><span style="width:75%;background:var(--done)"></span><span style="width:5%;background:var(--muted)"></span><span style="width:20%;background:var(--line)"></span></div>
      <div class="legend"><span><b>60</b> coming</span><span><b>4</b> declined</span><span><b>16</b> pending</span></div></div>
    <div class="card"><div class="row"><span class="dot" style="background:var(--done)">✓</span><b>Catering</b><span class="st" style="color:var(--done)">Booked</span><span class="who">Peter</span></div>
      <div class="note">“Caterer needs food preferences and allergies 10 days before delivery.”</div>
      <div class="prop"><span class="spark">✦</span><div><div class="pt">Create task: Send food order details to caterer</div><div class="sub">Catering · Peter · due Wed 14 Oct</div></div><button class="ok" title="Create task">✓</button><button class="no" title="Dismiss">✕</button></div></div>
    <div class="card list">
      <div class="row"><span class="dot" style="background:var(--decision)">?</span>Choose dinner menu<span class="st" style="color:var(--decision)">Needs your decision</span></div>
      <div class="row"><span class="dot" style="background:var(--waiting)">⏳</span>DJ contract<span class="st" style="color:var(--waiting)">Waiting on DJ</span></div>
      <div class="row"><span class="dot" style="background:var(--blocked)">⛔</span>Decorations<span class="st" style="color:var(--blocked)">Blocked by venue access</span></div>
      <div class="row obs"><span class="dot" style="background:var(--obsolete)">–</span><s>Room list for rooftop bar</s><span class="st" style="color:var(--obsolete)">Obsolete</span></div>
    </div>
  </div>
</div>'''

css = """
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;padding:32px 16px}
h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}.intro{color:#6e6e73;max-width:760px;margin:0 0 32px;line-height:1.5}
section{margin:0 0 48px}h2{font-size:21px;margin:0 0 4px;letter-spacing:-.01em}.reg{color:#6e6e73;margin:0 0 14px}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.panel{background:var(--bg);color:var(--text);border-radius:18px;padding:16px;border:1px solid rgba(128,128,128,.25)}
.mode{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:8px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}.chip{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px}
.chip i{width:14px;height:14px;border-radius:4px;border:1px solid var(--line);display:inline-block}
.app{display:flex;flex-direction:column;gap:10px}
.ev{display:flex;justify-content:space-between;align-items:center}.evt{font-size:20px;font-weight:600;letter-spacing:-.01em}
.sub{font-size:12px;color:var(--muted)}
.btn{background:var(--accent);color:var(--card);border:0;border-radius:980px;padding:7px 14px;font:inherit;font-size:13px;font-weight:500}
.card{background:var(--card);border-radius:12px;padding:12px 14px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.row{display:flex;align-items:center;gap:10px;font-size:14px;min-height:28px}.row b{font-weight:600}
.list .row+.row{border-top:1px solid var(--line);padding-top:6px;margin-top:6px}
.dot{width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;display:grid;place-items:center;flex:none}
.st{margin-left:auto;font-size:13px;font-weight:500}.who{margin-left:auto;font-size:13px;color:var(--muted)}.st+.who{margin-left:8px}
.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;margin:10px 0 6px;gap:2px}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted)}.legend b{color:var(--text)}
.note{font-size:13px;color:var(--muted);font-style:italic;margin:6px 0 8px 32px}
.prop{display:flex;align-items:center;gap:10px;background:var(--accentSoft);border-radius:10px;padding:10px 12px;margin-left:32px}
.pt{font-size:13px;font-weight:600}.spark{color:var(--accent);font-size:16px}
.ok,.no{border:0;border-radius:50%;width:30px;height:30px;font-size:14px;flex:none}.ok{margin-left:auto;background:var(--accent);color:var(--card)}
.no{background:transparent;color:var(--muted)}.obs{color:var(--obsolete)}
@media(max-width:420px){.pair{grid-template-columns:1fr}.note,.prop{margin-left:0}}
"""
# hex values documented per theme in <style> comments below
comments = "\n".join(f"/* {n}: light {l} | dark {d} */" for n, _, l, d in THEMES)
body = "".join(f'<section><h2>{n}</h2><p class="reg">{r}</p><div class="pair">{panel("light", l)}{panel("dark", d)}</div></section>'
               for n, r, l, d in THEMES)
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arrangly Colour Themes</title><style>{css}
/* Status tokens (shared): {STATUS} */
{comments}</style></head><body>
<h1>Arrangly — colour themes, round 1</h1>
<p class="intro">Five calm, Apple-clean directions for the accent and surfaces, each in light (default) and dark. The status colours (done, waiting, blocked, needs decision, obsolete) stay the same across all five on purpose: they carry meaning, and each one also has its own icon and label, so colour is never the only signal. Snippet: Leah's dashboard glance (KF-1).</p>
{body}</body></html>"""
open(out, "w").write(html)
print(out)
