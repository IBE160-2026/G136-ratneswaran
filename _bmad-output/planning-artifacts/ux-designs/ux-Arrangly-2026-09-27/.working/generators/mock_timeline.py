import sys; sys.path.insert(0, "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/generators")
from mock_common import *
from mock_desktop import sidebar, SIDE_CSS
import datetime as dt
D0 = dt.date(2026, 9, 21); PX = 24; DAYS = 35; TODAY = 7; EVENT = 33
LANES = [
 ("Venue", "Stine (lead) · Sheila", [
   ("Shortlist venues", 0, 4, "done", 0), ("Choose venue", 5, 5, "dec-done", 1), ("Book venue", 6, 9, "done", 0),
   ("Book 8 single + 2 double rooms", 10, 17, "waiting", 1, "Waiting on hotel"), ("Venue setup", 26, 33, "parent", 0)]),
 ("Food & Beverage", "Peter (lead) · Sheila", [
   ("Book catering", 0, 5, "done", 0), ("Choose dinner menu", 10, 10, "dec-open", 0), ("Send food order details", 11, 23, "todo", 1), ("Bar staff", 25, 33, "todo", 0)]),
 ("Entertainment", "Martin (lead)", [
   ("DJ contract", 3, 14, "waiting", 0, "Waiting on DJ"), ("Write quiz questions", 8, 24, "unacc", 1), ("Soundcheck", 28, 33, "blocked:DJ contract", 0)]),
 ("Guests", "Leah", [
   ("Collect RSVPs", 0, 10, "prog", 0), ("Send final headcount to venue", 0, 6, "overdue", 1), ("Seating chart", 11, 26, "blocked:final RSVPs", 0)]),
 ("Travel & Logistics", "Martin", [
   ("Hotel room list", 17, 23, "blocked:rooms booked", 0), ("Airport pickup · Chris +1", 20, 32, "todo", 1)]),
]
STYLE = {"done": ("done", "Done"), "waiting": ("hourglass", "Waiting on hotel"), "todo": ("", "Not started"), "prog": ("", "In progress"),
         "overdue": ("alert", "Overdue 1 day"), "unacc": ("userround", "Not yet accepted")}
def bar(t, s, e, st, row, custom=None):
    x = s * PX + 4; w = max((e - s + 1) * PX - 8, 40); y = 14 + row * 46
    if st.startswith("dec"):
        cls = "dm open" if st == "dec-open" else "dm res"; lab = "Needs your decision" if st == "dec-open" else "Decided: Hotel"
        return f'<button class="{cls}" style="left:{x+PX/2-15}px;top:{y+4}px" aria-label="Decision: {t}, {lab}">{ic("diamond",14)}<span class="dml"><b>{t}</b><i>{lab}</i></span></button>'
    if st.startswith("blocked"):
        return f'<button class="tb blk" style="left:{x}px;top:{y}px;width:{w}px">{ic("lock",14)}<span><b>{t}</b><i>Waits for: {st.split(":")[1]}</i></span></button>'
    if st == "parent":
        return f'''<div class="tb parent" style="left:{x}px;top:{y}px;width:{w}px"><span><b>{t}</b><i>Not started</i></span>
          <button class="tb blk sub1">{ic("lock",13)}<span><b>Decorations</b><i>Waits for: venue access</i></span></button></div>'''
    icn, lab = STYLE[st]; lab = custom or lab
    return f'<button class="tb {st}" style="left:{x}px;top:{y}px;width:{w}px">{ic(icn,14) if icn else ""}<span><b>{t}</b><i>{lab}</i></span></button>'

def axis():
    out = ""
    for d in range(DAYS):
        day = D0 + dt.timedelta(d)
        if day.weekday() == 0: out += f'<div class="wk" style="left:{d*PX}px">{day.strftime("%a %-d %b")}</div>'
    return out

def tl(c):
    W = DAYS * PX
    lanes = "".join(f'''<div class="lane"><div class="lh"><b>{n}</b><span>{who}</span></div>
      <div class="lt" style="width:{W}px">{"".join(bar(*t) for t in ts)}</div></div>''' for n, who, ts in LANES)
    return f'''<div class="win m" style="{vars(c)};width:1280px"><div class="chrome"><i></i><i></i><i></i></div><div class="desk">{sidebar("Timeline")}
<main><div class="hd"><div><div class="t">Timeline</div><div class="sub" style="font-size:15px;margin-top:6px">Lucas's 40th · one lane per Role · read-only</div></div>
 <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px"><div class="seg"><span class="on">{ic('timeline',14)}Lanes</span><span>{ic('list',14)}List</span></div><div class="legend"><span>{ic("done",14)}Done</span><span style="color:var(--waiting)">{ic("hourglass",14)}Waiting</span><span style="color:var(--overdue)">{ic("alert",14)}Overdue</span><span>{ic("lock",14)}Blocked</span><span style="color:var(--decision)">{ic("diamond",14)}Decision</span></div></div></div>
<div class="tlw"><div class="lhs"><div class="axh">Role</div>{"".join(f'<div class="lh2"><b>{n}</b><span>{w}</span></div>' for n,w,_ in LANES)}</div>
 <div class="scroll" tabindex="0" role="region" aria-label="Timeline, scroll horizontally"><div class="inner" style="width:{W}px">
  <div class="axis">{axis()}</div>
  <div class="today" style="left:{TODAY*PX+PX/2}px"><span>Today</span></div><div class="evday" style="left:{EVENT*PX}px;width:{PX}px"><span>Party · Sat 24 Oct</span></div>
  {"".join(f'<div class="lt" style="width:{W}px">{"".join(bar(*t) for t in ts)}</div>' for _,_,ts in LANES)}
 </div></div><div class="fade"></div></div>
<div class="foot"><span>Scroll sideways for later dates</span><span class="showobs">Show obsolete (1)</span></div>
</main></div></div>'''

CSS = SIDE_CSS + """main{padding:36px 36px}.legend{display:flex;gap:14px;font-size:13px;color:var(--muted)}.legend span{display:flex;gap:5px;align-items:center}.legend span:first-child{color:var(--done)}
.tlw{position:relative;display:flex;background:var(--card);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}
.lhs{width:170px;flex:none;border-right:1px solid var(--line);background:var(--card);z-index:2}.axh{height:40px;border-bottom:1px solid var(--line);font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:13px 16px}
.lh2{height:112px;border-bottom:1px solid var(--line);padding:14px 16px;display:flex;flex-direction:column;gap:4px}.lh2 b{font-size:15px}.lh2 span{font-size:12px;color:var(--muted)}
.scroll{overflow-x:auto;flex:1;position:relative}.scroll:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.inner{position:relative}
.axis{height:40px;border-bottom:1px solid var(--line);position:relative}.wk{position:absolute;top:0;height:100%;border-left:1px solid var(--line);font-size:12px;color:var(--muted);padding:13px 8px;white-space:nowrap}
.lt{position:relative;height:112px;border-bottom:1px solid var(--line)}
.today{position:absolute;top:0;bottom:0;border-left:2px solid var(--accent);z-index:1}.today span{position:absolute;bottom:6px;left:4px;font-size:11px;font-weight:700;color:var(--accent);background:var(--card);padding:0 4px}
.evday{position:absolute;top:40px;bottom:0;background:var(--accentSoft);opacity:.7}.evday span{position:absolute;top:6px;right:2px;writing-mode:vertical-rl;white-space:nowrap;font-size:11px;font-weight:600;color:var(--accent)}
.tb{position:absolute;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--card);display:flex;align-items:center;gap:6px;padding:0 10px;font:inherit;color:var(--text);text-align:left;overflow:hidden;z-index:2;cursor:pointer}
.tb span{display:flex;flex-direction:column;min-width:0}.tb b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tb i{font-style:normal;font-size:11px;color:var(--muted);white-space:nowrap}
.tb.done{border-color:transparent;background:color-mix(in srgb,var(--done) 12%,var(--card));color:var(--text)}.tb.done .ic{color:var(--done)}.tb.done i{color:var(--done)}
.tb.waiting{border-color:var(--waiting)}.tb.waiting .ic,.tb.waiting i{color:var(--waiting)}
.tb.overdue{border:1.5px solid var(--overdue);background:color-mix(in srgb,var(--overdue) 8%,var(--card))}.tb.overdue .ic,.tb.overdue i{color:var(--overdue)}
.tb.blk{background:var(--blockedRow);color:var(--muted);border-style:dashed}.tb.blk b{color:var(--muted)}
.tb.prog{border-color:var(--accent)}.tb.prog i{color:var(--accent)}.tb.unacc{border-style:dashed}
.tb.parent{height:92px;align-items:flex-start;flex-direction:column;padding:8px 10px;gap:6px;cursor:default}.sub1{position:relative;height:40px;width:100%}
.dm{position:absolute;z-index:3;width:30px;height:30px;border:0;background:none;padding:0;color:var(--decision);display:grid;place-items:center;cursor:pointer}
.dm .ic{width:26px;height:26px}.dm.open .ic{fill:var(--decision)}.dm.res .ic{fill:var(--decisionSoft)}
.dml{position:absolute;left:34px;top:0;display:flex;flex-direction:column;white-space:nowrap;text-align:left;font-size:12px;color:var(--text)}.dml i{font-style:normal;font-size:11px;color:var(--decision)}.dm.open .dml b{color:var(--decision)}
.fade{position:absolute;right:0;top:0;bottom:0;width:48px;background:linear-gradient(90deg,transparent,var(--card));pointer-events:none;z-index:3}
.seg{display:flex;background:var(--blockedRow);border-radius:9999px;padding:3px;font-size:13px}.seg span{display:flex;gap:5px;align-items:center;padding:4px 12px;border-radius:9999px;color:var(--muted)}.seg .on{background:var(--card);color:var(--text);font-weight:600;box-shadow:var(--shadow)}.foot{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-top:10px}.showobs{color:var(--accent)}"""
# lane header column duplicated as .lhs; hide the per-lane inline header used earlier
html = doc("Arrangly Key Screen Timeline", "Key screen · Timeline (desktop)",
  "Governs: EXPERIENCE.md › Timeline row (one lane per Role, dependency then deadline, subtasks nested in parent, decision points visible before resolution, horizontal scroll, read-only) · PRD FR-20. Sticky Role column; scroll area is keyboard-focusable. Light then dark. Spine wins on conflict.",
  f'<p class="cap" style="text-align:center">Light · Warm Sky</p><div class="stage">{tl(LIGHT)}</div><p class="cap" style="text-align:center">Dark · Clear Sky</p><div class="stage">{tl(DARK)}</div>', CSS)
open(WS + "key-timeline-desktop.html", "w").write(html); print("timeline ok")
