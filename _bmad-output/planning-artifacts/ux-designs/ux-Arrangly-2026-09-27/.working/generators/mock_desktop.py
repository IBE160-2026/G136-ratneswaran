import sys; sys.path.insert(0, "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/generators")
from mock_common import *

def sidebar(active):
    items = [("dashboard","Dashboard",""),("tasks","My tasks",'<span class="nb">2</span>'),("users","Guests",""),("timeline","Timeline",""),
             ("team","Team & Roles",""),("megaphone","Announcements",""),("landing","Landing page",""),("settings","Event settings",""),("grid","All events","")]
    rows = "".join(f'<a class="si{" on" if l==active else ""}"{" aria-current=page" if l==active else ""}>{ic(i,17)}<span>{l}</span>{b}</a>' for i,l,b in items)
    return f'''<aside><div class="brand">Arrangly</div><div class="grp">Lucas's 40th</div>{rows}<div class="sp"></div>
      <a class="si prof"><span class="av">LH</span><span>Leah Hansen</span></a></aside>'''

SIDE_CSS = """.desk{display:flex;min-height:720px}aside{width:240px;background:var(--side);border-right:1px solid var(--line);padding:18px 12px;display:flex;flex-direction:column;gap:2px}
.brand{font-weight:700;font-size:17px;padding:0 10px 14px;letter-spacing:-.01em}.grp{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:6px 10px}
.si{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:15px;color:var(--text);text-decoration:none}.si .ic{color:var(--muted)}
.si.on{background:var(--accentSoft);color:var(--accent);font-weight:600;box-shadow:inset 3px 0 0 var(--accent)}.si.on .ic{color:var(--accent)}.sp{flex:1}
.nb{margin-left:auto;background:var(--badge);color:#fff;font-size:11px;font-weight:600;border-radius:9999px;min-width:20px;height:20px;display:grid;place-items:center;padding:0 6px}
.av{width:26px;height:26px;border-radius:50%;background:var(--accentSoft);color:var(--accent);font-size:11px;font-weight:700;display:grid;place-items:center}.prof{border-top:1px solid var(--line);border-radius:0;padding-top:12px}
main{flex:1;padding:36px 44px;--r:16px;min-width:0}.hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px}
.t{font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.1}"""

DASH_CSS = SIDE_CSS + """.col{max-width:880px;display:flex;flex-direction:column;gap:14px}.lbl{margin:10px 0 0}
.row{display:flex;align-items:center;gap:12px;min-height:48px;font-size:16px;padding:0 18px}.row .st{margin-left:auto;font-size:14px;font-weight:500;display:flex;gap:6px;align-items:center}
.list .row+.row{border-top:1px solid var(--line)}.who{font-size:14px;color:var(--muted);margin-left:14px;min-width:54px;text-align:right}
.decide{background:var(--decisionSoft);border:1.5px solid var(--decision);box-shadow:0 4px 14px rgba(125,60,152,.16);padding:12px 18px}
.decide .top{display:flex;gap:12px;align-items:center}.decide .ttl{font-size:17px;font-weight:600}.decide .ic{color:var(--decision)}
.dbtn{margin-left:auto;background:var(--decision);color:var(--decisionFg)}.opts{display:flex;gap:8px;margin:8px 0 2px 30px}.opts span{font-size:13px;border:1px solid var(--line);background:var(--card);border-radius:9999px;padding:3px 12px}
.prop{background:var(--accentSoft);display:flex;align-items:center;gap:12px;padding:12px 18px}.prop>.ic{color:var(--accent)}.pt{font-weight:600;font-size:15px}
.acts{margin-left:auto;display:flex;gap:6px}.ok,.no{width:34px;height:34px;border-radius:50%;border:0;display:grid;place-items:center}.ok{background:var(--accent);color:var(--accentFg)}.no{background:transparent;color:var(--muted)}
.blk{background:var(--blockedRow);color:var(--muted)}.blk .st{color:var(--muted);font-weight:400}.showobs{font-size:14px;color:var(--accent);padding:8px 18px}
.note{font-size:14px;color:var(--muted);padding:0 18px 12px 48px;margin-top:-6px}.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px;width:180px}
.nlab{background:var(--overdue);color:#fff;font-size:11px;padding:1px 7px;border-radius:9999px}"""

def dash(c):
    return f'''<div class="win m" style="{vars(c)}"><div class="chrome"><i></i><i></i><i></i></div><div class="desk">{sidebar("Dashboard")}
<main><div class="hd"><div><div class="t">Dashboard</div><div class="sub" style="font-size:15px;margin-top:6px">Lucas's 40th · Sat 24 Oct · 26 days to go</div></div>
 <button class="btn btn-p">{ic("plus",16)}New task</button></div>
<div class="col">
 <h2 class="lbl">Needs you <span class="cnt">4</span></h2>
 <div class="card decide"><div class="top">{ic("help",20)}<div><div class="ttl">Choose dinner menu</div><div class="sub">Peter sent 3 options · decide by Thu 1 Oct</div></div><button class="btn dbtn">Decide</button></div>
  <div class="opts"><span>Buffet</span><span>3-course</span><span>Tapas</span></div></div>
 <div class="card prop">{ic("sparkles",20)}<div><div class="pt">Create task: Send food order details to caterer</div><div class="sub">From caterer note · Catering · Peter · due Wed 14 Oct</div></div>
  <div class="acts"><button class="ok" aria-label="Create task">{ic("check",18)}</button><button class="no" aria-label="Dismiss suggestion">{ic("x",18)}</button></div></div>
 <div class="card list"><div class="row"><span style="color:var(--overdue)">{ic("alert",20)}</span>Send final headcount to venue<span class="st" style="color:var(--overdue)">Overdue 1 day</span><span class="who">You</span></div>
  <div class="row"><span style="color:var(--muted)">{ic("userround",20)}</span>Write quiz questions<span class="st" style="color:var(--muted)">Not yet accepted · 2 days</span><span class="who">Martin</span></div></div>
 <h2 class="lbl">At risk <span class="cnt dim">3</span></h2>
 <div class="card list"><div class="row"><span style="color:var(--waiting)">{ic("hourglass",20)}</span>DJ contract<span class="st" style="color:var(--waiting)">Waiting on DJ</span><span class="who">Martin</span></div>
  <div class="row blk">{ic("lock",20)}Decorations<span class="st">Waits for: venue access</span><span class="who">Sheila</span></div>
  <div class="row blk">{ic("lock",20)}Seating chart<span class="st">Waits for: final RSVPs</span><span class="who">You</span></div>
  <div class="showobs">Show obsolete (1)</div></div>
 <h2 class="lbl">On track</h2>
 <div class="card list"><div class="row"><span style="color:var(--done)">{ic("done",20)}</span>Venue<span class="st" style="color:var(--done)">Booked · Hotel Alexandra</span><span class="who">Stine</span></div>
  <div class="row"><span style="color:var(--done)">{ic("done",20)}</span>Catering<span class="st" style="color:var(--done)">Booked</span><span class="who">Peter</span></div>
  <div class="note">“Caterer needs food preferences and allergies 10 days before delivery.”</div>
  <div class="row"><span style="color:var(--accent)">{ic("users",20)}</span>Guests<span class="st"><span class="bar"><span style="width:75%;background:var(--done)"></span><span style="width:5%;background:var(--muted)"></span><span style="flex:1;background:var(--line)"></span></span></span>
   <span class="who" style="min-width:210px;color:var(--text)"><b>60</b> coming · 4 declined · 16 pending</span></div></div>
</div></main></div></div>'''

html = doc("Arrangly Key Screen Dashboard", "Key screen · Leah's Dashboard (desktop, Airy)",
  "Governs: DESIGN.md › Components (Sidebar, Decision card, Proposal row, Task row, Section header) · EXPERIENCE.md › Dashboard sections, KF-1. Light (default) then dark. The spine wins on any conflict.",
  f'<p class="cap" style="text-align:center">Light · Warm Sky</p><div class="stage">{dash(LIGHT)}</div><p class="cap" style="text-align:center">Dark · Clear Sky</p><div class="stage">{dash(DARK)}</div>', DASH_CSS)
open(WS + "key-dashboard-desktop.html", "w").write(html); print("dashboard ok")
