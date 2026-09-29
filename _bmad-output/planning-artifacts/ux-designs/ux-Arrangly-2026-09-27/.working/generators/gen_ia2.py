import json, random, string
out = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/ia-2026-09-28-v2.excalidraw"
els = []
ALPH = string.digits + string.ascii_uppercase + string.ascii_lowercase
def idx(n): return "abcdefghijklmnopqrstuvwxyz"[n // len(ALPH)] + ALPH[n % len(ALPH)]
def base(t, x, y, w, h, **kw):
    e = dict(id=f"e{len(els)}", type=t, x=x, y=y, width=w, height=h, angle=0, strokeColor=kw.get("stroke", "#1e1e1e"),
             backgroundColor=kw.get("bg", "transparent"), fillStyle="solid", strokeWidth=kw.get("sw", 1),
             strokeStyle=kw.get("style", "solid"), roughness=1, opacity=100, groupIds=[], frameId=None,
             roundness={"type": 3} if t == "rectangle" else ({"type": 2} if t == "arrow" else None),
             seed=random.randint(1, 2**31), version=1, versionNonce=random.randint(1, 2**31), isDeleted=False,
             boundElements=None, updated=1, link=None, locked=False, index=idx(len(els)))
    els.append(e); return e
def text(x, y, s, size=16, color="#1e1e1e"):
    lines = s.split("\n")
    e = base("text", x, y, max(len(l) for l in lines) * size * 0.55, len(lines) * size * 1.25, stroke=color)
    e.update(text=s, originalText=s, fontSize=size, fontFamily=2, textAlign="left", verticalAlign="top",
             baseline=size, containerId=None, lineHeight=1.25, autoResize=True)
def box(x, y, w, h, title, body="", bg="#ffffff"):
    base("rectangle", x, y, w, h, bg=bg)
    text(x + 12, y + 10, title, 17)
    if body: text(x + 12, y + 36, body, 13, "#555555")
    return (x, y, w, h)
def arrow(a, b, label="", dashed=False, color="#1e1e1e"):
    ax, ay = a[0] + a[2] / 2, a[1] + a[3]; bx, by = b[0] + b[2] / 2, b[1]
    if b[1] < a[1] + a[3]:  # sideways
        ax, ay = (a[0] + a[2], a[1] + a[3] / 2) if b[0] > a[0] else (a[0], a[1] + a[3] / 2)
        bx, by = (b[0], b[1] + b[3] / 2) if b[0] > a[0] else (b[0] + b[2], b[1] + b[3] / 2)
    e = base("arrow", ax, ay, abs(bx - ax), abs(by - ay), stroke=color, style="dashed" if dashed else "solid", sw=2 if dashed else 1)
    e.update(points=[[0, 0], [bx - ax, by - ay]], lastCommittedPoint=None, startBinding=None, endBinding=None,
             startArrowhead=None, endArrowhead="arrow", elbowed=False)
    if label: text((ax + bx) / 2 + 6, (ay + by) / 2 - 8, label, 12, color)


BLUE, AMBER, GREY, LILAC = "#dbe9fb", "#fbefd6", "#f1ece4", "#efe4f6"
text(40, 10, "Arrangly — Information Architecture v2 (2026-09-28)", 28)
text(40, 52, "Blue = Team experience (Organizer + Role-holders, same app, RBAC-scoped) · Amber = Guest experience · dashed = hand-off · [Core]/[Stretch] = tier", 14, "#555555")

# Entry
e1 = box(40, 100, 300, 60, "Log in / Sign up", "email + password", BLUE)
e2 = box(370, 100, 300, 60, "Invite link → Create account", "role-holder · name/email pre-filled", BLUE)
e3 = box(1120, 100, 380, 60, "Magic link (per invite)", "no signup · expired → explanation", AMBER)

# Team column
X, W = 40, 1000
t1 = box(X, 210, 630, 110, "All events  (sidebar: 'All events')", "cards with a brief overview of every event you're involved in\neach card: ◯ your open-task count · red badge = new task\nred outline + '1 overdue' / mustard + '2 at risk'\nlast card: same-size blue  [ + Create new event ]", BLUE)
t0 = box(700, 210, 340, 110, "Profile & Settings", "name · email · password\nAppearance: Light / Dark / System\n(notifications, sign out)", BLUE)
t2 = box(X, 360, 630, 90, "Create event wizard  (Organizer)", "Questionnaire → Guests → Description → Review ✦ proposals\n→ Build team + pick Role leads → Publish (invites go out)", BLUE)
t3 = box(X, 490, 1000, 250, "Event workspace — left sidebar on desktop · ☰ top-right on phone · items outside your Role hidden", "• Dashboard — Needs you (your tasks, decisions, ✦ proposals, overdue) › At risk › On track\n• My tasks — assigned to you + (Organizer) everything not yet delegated · [Delegate] on each\n• Guests — RSVP list, allergies/hotel (only to owning Role), remind non-responders\n• Timeline — one swimlane per Role, read-only, horizontal scroll\n• Team & Roles — Organizer: activate Roles, assign/revoke, set Role lead · others: who's who\n• Announcements — send to person / Role / group · flat feed\n• Landing page & Run of Show — draft → Organizer reviews → Publish\n• Event settings (Organizer)", BLUE)
t4 = box(X, 780, 480, 110, "Task detail — FULL PAGE", "scope · deadline · status + note · dependencies · subtasks\n[Delegate] (Organizer, Role lead) · add options → send as Decision\n✦ AI-drafted email → opens own mail app", BLUE)
t5 = box(X + 520, 780, 480, 110, "Decision — FULL PAGE", "context + options → pick one\n→ spawns follow-up task · option-tied tasks marked obsolete\n(reversible)", LILAC)
arrow(e1, t1); arrow(e2, t1); arrow(t1, t2, "+ Create new event"); arrow(t2, t3, "Publish"); arrow(t3, t4, "open task"); arrow(t3, t5, "Decide")
text(680, 400, "tap event card → workspace", 12, "#555555")

# Guest column
X, W = 1120, 380
g1 = box(X, 210, W, 110, "RSVP flow  [Core]", "Yes / No (No → ends)\nYes → plus-one · allergies & food\n→ hotel? → other needs", AMBER)
g2 = box(X, 360, W, 60, "Confirmation + optional PIN  [Core]", "skipped if he already has an account", AMBER)
g3 = box(X, 460, W, 150, "Event landing page = Run of Show  [Core]", "about the event · dress code\nday-of program with timings\nlocation · food menu · practical info\n(visible once Organizer publishes)", AMBER)
g4 = box(X, 650, W, 120, "Guest Dashboard  [Core]", "my RSVP (editable) · resolved for me\n(e.g. taxi details)\n[ Request ] → need to organizers", AMBER)
g5 = box(X, 810, 180, 80, "Registry", "[Stretch]", AMBER)
g6 = box(X + 200, 810, 180, 80, "Seating chart", "[Stretch · not in PRD]", AMBER)
arrow(e3, g1); arrow(g1, g2, "Submit"); arrow(g2, g3); arrow(g3, g4)
arrow(g4, t3, "Request / other needs → ✦ proposed task on owning Role", dashed=True, color="#0066CC")
arrow(t3, g3, "Publish landing page / Run of Show", dashed=True, color="#A04A00")

box(40, 930, 1460, 70, "Cross-cutting", "One account can be Organizer on one event, Role-holder or Guest on another — all appear under All events · RBAC enforced server-side, UI hides what your Role can't reach · same status language on every surface · light/dark from Profile & Settings", GREY)

assert all(len(e["index"]) == 2 for e in els)
json.dump(dict(type="excalidraw", version=2, source="https://excalidraw.com", elements=els,
               appState=dict(gridSize=None, viewBackgroundColor="#ffffff"), files={}), open(out, "w"), ensure_ascii=False, indent=1)
print(out, len(els), "elements, all indices 2-char")
