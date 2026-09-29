# Round 2: light-mode hybrids of A (Clear Sky) + D (Warm Sand); dark = A Clear Sky dark; attention-first dashboard.
out = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/color-themes-3.html"
S = {"light": dict(done="#1F7A35", waiting="#A04A00", blocked="#C4001A", decision="#7D3C98", decisionSoft="#F4EAF8", obsolete="#8E8E93"),
     "dark":  dict(done="#30D158", waiting="#FF9F0A", blocked="#FF6961", decision="#D08CF2", decisionSoft="#2E1F38", obsolete="#8E8E93")}
SKY_DARK = dict(bg="#000000", card="#1C1C1E", text="#F5F5F7", muted="#98989D", line="#38383A", accent="#4DA3FF", accentSoft="#0B2A4A", warm="#4DA3FF")
THEMES = [
  ("Warm Sky", "Light: Warm Sand surfaces + Clear Sky blue. Dark: Clear Sky. Decision card slimmed; blocked rows greyed.",
   dict(bg="#FAF7F2", card="#FFFFFF", text="#231F1A", muted="#75695C", line="#EDE6DB", accent="#0066CC", accentSoft="#E8F1FB", warm="#0066CC", greyRow="#F1ECE4"),
   {**SKY_DARK, "greyRow": "#141416"}),
]

def panel(mode, c):
    v = ";".join(f"--{k}:{x}" for k, x in {**c, **S[mode]}.items())
    return f'''<div class="panel" style="{v}"><div class="mode">{mode}</div><div class="app">
 <div class="ev"><div><div class="evt">Lucas's 40th</div><div class="sub">Sat 24 Oct · 26 days to go</div></div><button class="btn">+ New task</button></div>
 <div class="sec">Needs you <span class="count">3</span></div>
 <div class="card decide"><div class="dh"><span class="dot" style="background:var(--decision)">?</span><div><div class="dt">Choose dinner menu</div>
   <div class="sub">Peter sent 3 options · decide by Thu 1 Oct</div></div><button class="dbtn">Decide</button></div>
   <div class="opts"><span>Buffet</span><span>3-course</span><span>Tapas</span></div></div>
 <div class="card prop"><span class="spark">✦</span><div><div class="pt">Create task: Send food order details to caterer</div>
   <div class="sub">From caterer note · Catering · Peter · due Wed 14 Oct</div></div><button class="ok" title="Create task">✓</button><button class="no" title="Dismiss">✕</button></div>
 <div class="card row"><span class="dot" style="background:var(--blocked)">!</span>Send final headcount to venue<span class="st" style="color:var(--blocked)">Overdue 1 day</span></div>
 <div class="sec">At risk <span class="count dim">3</span></div>
 <div class="card list"><div class="row"><span class="dot" style="background:var(--waiting)">⏳</span>DJ contract<span class="st" style="color:var(--waiting)">Waiting on DJ</span></div>
   <div class="row blk"><span class="dot" style="background:var(--obsolete)">🔒</span>Decorations<span class="st">Waits for: venue access</span></div>
   <div class="row blk"><span class="dot" style="background:var(--obsolete)">🔒</span>Seating chart<span class="st">Waits for: final RSVPs</span></div>
   <div class="row obs"><span class="dot" style="background:var(--obsolete)">–</span><s>Room list for rooftop bar</s><span class="st">Obsolete</span></div></div>
 <div class="sec">On track</div>
 <div class="card list quiet"><div class="row"><span class="dot" style="background:var(--done)">✓</span>Venue<span class="st" style="color:var(--done)">Booked</span></div>
   <div class="row"><span class="dot" style="background:var(--done)">✓</span>Catering<span class="st" style="color:var(--done)">Booked</span></div>
   <div class="row"><span class="dot" style="background:var(--accent)">👥</span>Guests<span class="st"><b>60</b> coming · 4 declined · 16 pending</span></div></div>
</div></div>'''

css = """*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;padding:32px 16px}
h1{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}.intro{color:#6e6e73;max-width:780px;margin:0 0 32px;line-height:1.5}
section{margin:0 0 48px}h2{font-size:21px;margin:0 0 4px}.reg{color:#6e6e73;margin:0 0 14px;max-width:780px}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.panel{background:var(--bg);color:var(--text);border-radius:18px;padding:16px;border:1px solid rgba(128,128,128,.25)}
.mode{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px}
.app{display:flex;flex-direction:column;gap:8px}.ev{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.evt{font-size:22px;font-weight:700;letter-spacing:-.02em;color:var(--warm)}.sub{font-size:12px;color:var(--muted)}
.btn{background:var(--accent);color:var(--card);border:0;border-radius:980px;padding:7px 14px;font:inherit;font-size:13px;font-weight:500}
.sec{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:8px;display:flex;align-items:center;gap:6px}
.count{background:var(--decision);color:#fff;border-radius:980px;font-size:11px;padding:1px 7px}.count.dim{background:var(--muted)}
.card{background:var(--card);border-radius:12px;padding:12px 14px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.decide{background:var(--decisionSoft);border:1.5px solid var(--decision);padding:10px 14px;box-shadow:0 4px 14px rgba(125,60,152,.18)}
.dh{display:flex;gap:10px;align-items:center}.dt{font-size:17px;font-weight:600}
.opts{display:flex;gap:6px;margin:6px 0 0 32px}.opts span{font-size:12px;border:1px solid var(--line);background:var(--card);border-radius:980px;padding:3px 10px}
.dbtn{margin-left:auto;padding:7px 16px!important;background:var(--decision);color:#fff;border:0;border-radius:980px;padding:8px 18px;font:inherit;font-size:14px;font-weight:600}
.row{display:flex;align-items:center;gap:10px;font-size:14px;min-height:28px}
.list .row+.row{border-top:1px solid var(--line);padding-top:6px;margin-top:6px}.quiet{opacity:.85}.blk{background:var(--greyRow);color:var(--muted);border-radius:8px;padding:6px 8px!important;margin-left:-8px;margin-right:-8px}.blk .st{color:var(--muted);font-weight:400}.obs{color:var(--obsolete)}.obs .st{color:var(--obsolete)}
.dot{width:22px;height:22px;border-radius:50%;color:#fff;font-size:11px;display:grid;place-items:center;flex:none}
.st{margin-left:auto;font-size:13px;font-weight:500}.st b{color:var(--text)}
.prop{display:flex;align-items:center;gap:10px;background:var(--accentSoft)}.pt{font-size:13px;font-weight:600}.spark{color:var(--accent);font-size:16px}
.ok,.no{border:0;border-radius:50%;width:30px;height:30px;font-size:14px;flex:none}.ok{margin-left:auto;background:var(--accent);color:var(--card)}.no{background:transparent;color:var(--muted)}
@media(max-width:420px){.pair{grid-template-columns:1fr}}"""
comments = "\n".join(f"/* {n}: light {l} | dark {d} */" for n, _, l, d in THEMES)
body = "".join(f'<section><h2>{n}</h2><p class="reg">{r}</p><div class="pair">{panel("light", l)}{panel("dark", d)}</div></section>' for n, r, l, d in THEMES)
open(out, "w").write(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arrangly Colour Themes 3</title><style>{css}\n/* status: {S} */\n{comments}</style></head><body>
<h1>Arrangly — colour themes, round 3 — Warm Sky</h1>
<p class="intro">Your picks applied. Changes since round 2: the Decide button sits on the title row in the same right-hand column as ✓/✕; blocked/dependent rows are greyed across the whole line with a lock and a 'Waits for:' label; red is now reserved for things you can act on (overdue). The dashboard is now ordered by urgency: <b>Needs you</b> (decision, suggestion, overdue) → <b>At risk</b> → <b>On track</b>. The decision card is the loudest thing on screen: tinted, outlined, lifted, with its own button.</p>
{body}</body></html>""")
print(out)
