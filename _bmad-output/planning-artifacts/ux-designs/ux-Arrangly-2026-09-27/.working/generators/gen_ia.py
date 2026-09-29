import json, random, string
out = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/ia-2026-09-28.excalidraw"
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

BLUE, GREEN, AMBER, GREY = "#dbe9fb", "#dff1e5", "#fbefd6", "#f1ece4"
text(40, 10, "Arrangly — Information Architecture (draft, 2026-09-28)", 28)
text(40, 52, "Blue = Organizer (desktop) · Green = Role-holder (phone) · Amber = Guest (phone) · dashed = cross-persona hand-off", 14, "#555555")

# Organizer column
X = 40; W = 420
text(X, 100, "LEAH · Organizer · desktop", 20)
o1 = box(X, 140, W, 60, "Log in / Sign up", "email + password", BLUE)
o2 = box(X, 240, W, 70, "My events (home)", "event cards · + Create event", BLUE)
o3 = box(X, 350, W, 130, "Create event wizard", "1 Questionnaire → 2 Guests (link / manual)\n→ 3 Description → 4 Review AI proposals ✦\n(confirm each) → 5 Build team (invite links)\n→ 6 Publish (invites go out)", BLUE)
o4 = box(X, 520, W, 230, "Event workspace — left sidebar (☰ top-right on narrow)", "• Dashboard: Needs you › At risk › On track\n• Guests: RSVP list · allergies/hotel · remind\n• Timeline: one swimlane per Role (read-only)\n• Team & Roles: activate roles · assign/revoke\n• Announcements: send to person / Role / group\n• Run of Show: draft → Leah reviews → Publish\n• Event settings", BLUE)
o5 = box(X, 790, 200, 90, "Task detail", "FULL PAGE\nfrom any task row", BLUE)
o6 = box(X + 220, 790, 200, 90, "Decision", "FULL PAGE · pick option\n→ spawns task / obsoletes", BLUE)
arrow(o1, o2); arrow(o2, o3, "+ Create event"); arrow(o3, o4, "Publish"); arrow(o4, o5); arrow(o4, o6)
text(X + 430, 270, "open event", 12, "#555555")

# Role-holder column
X = 560
text(X, 100, "STINE · Role-holder · phone", 20)
r1 = box(X, 140, W, 60, "Invite link → Create account", "name/email pre-filled", GREEN)
r2 = box(X, 240, W, 110, "My events (home)", "each event: ◯ circle with open-task count\n• red badge = new task assigned\n• red circle+outline + '1 overdue' = urgent\n• mustard + '2 at risk' = waiting/blocked", GREEN)
r3 = box(X, 390, W, 110, "Event (☰ menu)", "• My tasks (by urgency)\n• Team: who's on which Role\n• Announcements feed", GREEN)
r4 = box(X, 540, W, 130, "Task detail — FULL PAGE", "scope · deadline · dependencies · subtasks\n• update status + note\n• add options → send as Decision\n• ✦ AI-drafted email → opens her mail app", GREEN)
arrow(r1, r2); arrow(r2, r3, "tap event"); arrow(r3, r4, "tap task")
arrow(r4, o6, "send as Decision → Leah's 'Needs you'", dashed=True, color="#7D3C98")

# Guest column
X = 1080
text(X, 100, "CHRIS · Guest · phone", 20)
g1 = box(X, 140, W, 60, "Magic link (per invite)", "no signup · expired → explanation", AMBER)
g2 = box(X, 240, W, 110, "RSVP flow", "Yes / No  (No → ends)\nYes → plus-one · allergies & food\n→ hotel needed? → other needs (free text)", AMBER)
g3 = box(X, 390, W, 80, "Confirmation", "'You're on the list' · optional 4-digit PIN\n(skipped if he already has an account)", AMBER)
g4 = box(X, 510, W, 110, "Guest Dashboard", "• RSVP status (editable)\n• Run of Show (once published)\n• Resolved for you (e.g. taxi details)", AMBER)
g5 = box(X, 660, W, 60, "Returning: email + PIN login", "or reopen magic link", AMBER)
arrow(g1, g2); arrow(g2, g3, "Submit"); arrow(g3, g4); arrow(g5, g4)
arrow(g2, o4, "free-text need → ✦ proposed task on owning Role", dashed=True, color="#0066CC")
arrow(o4, g4, "Run of Show published · need resolved", dashed=True, color="#A04A00")

# notes
box(40, 920, 1460, 70, "Cross-cutting", "Dark/light follows system with manual override · RBAC: every view scoped to the viewer's Role · status language identical on every surface · Leah can also be a Role-holder or Guest on other events (same account, same home)", GREY)

assert all(len(e["index"]) == 2 for e in els)
json.dump(dict(type="excalidraw", version=2, source="https://excalidraw.com", elements=els,
               appState=dict(gridSize=None, viewBackgroundColor="#ffffff"), files={}), open(out, "w"), ensure_ascii=False, indent=1)
print(out, len(els), "elements, all indices 2-char")
