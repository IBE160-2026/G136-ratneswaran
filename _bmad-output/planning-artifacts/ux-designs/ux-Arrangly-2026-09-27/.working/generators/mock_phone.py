import sys; sys.path.insert(0, "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/generators")
from mock_common import *
PH = """.pin{padding:6px 16px 24px;display:flex;flex-direction:column;gap:10px;--r:12px}.pt1{display:flex;justify-content:space-between;align-items:center;padding:4px 16px 0}
.menu{width:44px;height:44px;border-radius:50%;border:0;background:transparent;color:var(--accent);display:grid;place-items:center}
.lt{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0;padding:0 16px 6px}
.ec{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px;text-decoration:none;color:var(--text)}
.ec .r{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.ec b{font-size:17px;font-weight:600}
.ec.urg{border-color:var(--overdue)}.ec.risk{border-color:var(--risk)}
.circ{position:relative;width:40px;height:40px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-weight:700;font-size:15px;flex:none}
.urg .circ{border-color:var(--overdue);color:var(--overdue)}.risk .circ{border-color:var(--risk);color:var(--riskText)}
.bdg{position:absolute;top:-7px;right:-7px;background:var(--badge);color:#fff;font-size:11px;font-weight:700;border-radius:9999px;min-width:20px;height:20px;display:grid;place-items:center;border:2px solid var(--bg)}
.st2{font-size:13px;font-weight:600;display:flex;gap:5px;align-items:center}.urg .st2{color:var(--overdue)}.risk .st2{color:var(--riskText)}.ok2 .st2{color:var(--done)}
.create{background:var(--accentSoft);border:2.5px solid var(--accent);color:var(--accent);border-radius:12px;min-height:104px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:16px}
.past{font-size:15px;color:var(--accent);padding:6px 2px;display:flex;justify-content:space-between}
"""
def all_events(c):
    return f'''<div class="phone m" style="{vars(c)}"><div class="sbar"><span>9:41</span><span></span></div>
<div class="pt1"><span></span><button class="menu" aria-label="Menu">{ic("menu",22)}</button></div><h1 class="lt">All events</h1><div class="pin">
<a class="ec urg" aria-label="Lucas's 40th, Sat 24 Oct, Venue lead, 3 open tasks, 1 overdue, 1 new task"><div class="r"><div><b>Lucas's 40th</b><div class="sub">Sat 24 Oct · Venue (lead)</div></div><span class="circ">3<span class="bdg">1</span></span></div>
 <span class="st2">{ic("alert",14)}1 overdue</span></a>
<a class="ec risk"><div class="r"><div><b>Sheila &amp; Tom's wedding</b><div class="sub">Sat 12 Jun 2027 · Decorations</div></div><span class="circ">2</span></div>
 <span class="st2">{ic("hourglass",14)}2 at risk</span></a>
<a class="ec ok2"><div class="r"><div><b>Office Christmas party</b><div class="sub">Fri 11 Dec · Guest</div></div><span class="circ" style="color:var(--done)">{ic("check",18)}</span></div>
 <span class="st2">{ic("done",14)}You're going · Program published</span></a>
<a class="create">{ic("plus",20)}Create new event</a>
<a class="past"><span>Past events (2)</span>{ic("chevron",18)}</a></div></div>'''

TD = """.bk{display:flex;align-items:center;gap:2px;color:var(--accent);font-size:16px;padding:4px 10px;height:44px}
.acc{background:var(--accentSoft);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}.acc p{margin:0;font-size:15px}
.big{width:100%;justify-content:center;padding:12px;font-size:16px;min-height:44px}
.grp{background:var(--card);border-radius:12px;box-shadow:var(--shadow)}.gr{display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:44px;padding:0 14px;font-size:15px}
.grp .gr+.gr{border-top:1px solid var(--line)}.gr .k{color:var(--muted)}.gr .v{text-align:right;display:flex;gap:6px;align-items:center}
.selx{border:1px solid var(--input);border-radius:8px;min-height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:15px;background:var(--card);color:var(--waiting);font-weight:600}
.ta{border:1px solid var(--input);border-radius:8px;padding:10px 12px;font-size:15px;background:var(--card);min-height:64px}
.help{background:var(--accentSoft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}.help h3{margin:0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.hb{display:flex;align-items:center;gap:10px;min-height:44px;background:var(--card);border-radius:10px;padding:0 12px;color:var(--accent);font-weight:600;font-size:15px}
.hb .ic:last-child{margin-left:auto;color:var(--muted)}.hint{font-size:12px;color:var(--muted);margin-top:-2px}
.lab2{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:6px 2px 0}
.bar2{position:absolute;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 16px 26px;display:flex;gap:8px}
.bar2 .btn{flex:1;justify-content:center;min-height:44px;font-size:15px;white-space:nowrap}.bar2 .btn:last-child{flex:none;width:52px;padding:0}.tt{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0;line-height:1.2}
.chip{display:inline-flex;gap:5px;align-items:center;font-size:13px;font-weight:600;padding:3px 10px;border-radius:9999px;border:1px solid var(--line)}
"""
def task_detail(c, accepted):
    top = f'''<div class="sbar"><span>9:41</span><span></span></div><a class="bk">{ic("back",22)}Dashboard</a><div class="pin" style="padding-bottom:{110 if accepted else 24}px">
 <h1 class="tt">Book 8 single + 2 double rooms</h1>
 <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip" style="color:var(--muted)">{ic("link",13)}Blocks 2 tasks</span>{'<span class="chip" style="color:var(--waiting);border-color:var(--waiting)">'+ic("hourglass",13)+'Waiting on hotel</span>' if accepted else '<span class="chip" style="color:var(--muted)">'+ic("userround",13)+'Not yet accepted</span>'}</div>'''
    meta = f'''<div class="grp"><div class="gr"><span class="k">Role</span><span class="v">Venue</span></div><div class="gr"><span class="k">Owner</span><span class="v">Stine (you)</span></div>
 <div class="gr"><span class="k">Due</span><span class="v">Fri 9 Oct</span></div><div class="gr"><span class="k">Depends on</span><span class="v" style="color:var(--done)">{ic("done",15)}Choose venue</span></div>
 <div class="gr"><span class="k">From Leah</span><span class="v" style="color:var(--muted);font-size:14px">Hotel Alexandra chosen</span></div></div>'''
    if not accepted:
        body = f'''<div class="acc"><p><b>Leah assigned this to you.</b> Leah chose Hotel Alexandra. Book rooms for the out-of-town guests.</p>
 <button class="btn btn-p big">Accept</button></div>{meta}
 <div class="lab2">Help</div><div class="help"><a class="hb">{ic("sparkles",18)}Draft email to the hotel{ic("chevron",16)}</a><a class="hb">{ic("list",18)}Add options{ic("chevron",16)}</a></div></div>'''
        return f'<div class="phone m" style="{vars(c)}">{top}{body}</div>'
    body = f'''{meta}<div class="lab2">Status</div><div class="selx">{ic("hourglass",16)}Waiting on external<span style="margin-left:auto;color:var(--muted)">{ic("chevron",16)}</span></div>
 <div class="ta">Asked hotel, waiting for reply.</div>
 <div class="lab2">Help</div><div class="help"><a class="hb">{ic("sparkles",18)}Draft email to the hotel{ic("chevron",16)}</a><div class="hint">Opens in your own mail app. Arrangly never sends it for you.</div>
 <a class="hb">{ic("list",18)}Add options{ic("chevron",16)}</a></div></div>
 <div class="bar2"><button class="btn btn-p">{ic("check",16)}Mark done</button><button class="btn btn-g">Delegate</button><button class="btn btn-g" aria-label="Report a problem">{ic("flag",16)}</button></div>'''
    return f'<div class="phone m" style="{vars(c)}">{top}{body}</div>'

LP = """.hero{padding:8px 20px 18px}.hero h1{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:6px 0 4px;line-height:1.1}
.going{display:inline-flex;gap:6px;align-items:center;background:color-mix(in srgb,var(--done) 12%,var(--card));color:var(--done);font-weight:600;font-size:14px;border-radius:9999px;padding:6px 12px;margin-top:10px}
.sec{background:var(--card);border-radius:12px;box-shadow:var(--shadow);padding:14px 16px;display:flex;flex-direction:column;gap:6px}.sec h2{margin:0 0 2px;font-size:17px;display:flex;gap:8px;align-items:center}.sec h2 .ic{color:var(--accent)}
.sec p{margin:0;font-size:15px;line-height:1.45}.prog{display:grid;grid-template-columns:52px 1fr;row-gap:8px;font-size:15px}.prog time{font-weight:600;color:var(--muted)}
.sticky{position:absolute;left:0;right:0;bottom:0;padding:10px 16px 26px;background:linear-gradient(transparent,var(--bg) 30%)}
.res{background:var(--accentSoft)}.req{border-left:3px solid var(--line);padding-left:10px;font-size:15px}.rep{font-size:14px;color:var(--text);margin-top:4px;display:flex;gap:6px}
"""
def landing(c):
    return f'''<div class="phone m" style="{vars(c)}" lang="nb"><div class="sbar"><span>9:41</span><span></span></div><div class="hero">
 <div class="sub">Leah inviterer deg til</div><h1>Lucas' 40-årsdag</h1><div class="sub" style="font-size:15px"><time datetime="2026-10-24T18:00">lør. 24. okt., 18:00</time> · Hotel Alexandra</div>
 <span class="going">{ic("done",16)}Du kommer · 2 personer</span></div>
<div class="pin" style="padding-bottom:100px">
 <div class="sec"><h2>{ic("info",18)}Om festen</h2><p>Lørdag 24. oktober fyller Lucas 40, og det skal feires skikkelig! Vi samles på Hotel Alexandra til en kveld med god mat, varme ord og mye latter. Etter velkomstdrinken setter vi oss til en treretters middag, før venner og kolleger hever glasset for jubilanten. Utover kvelden venter en morsom quiz, og når stemningen er på topp tar DJ-en over dansegulvet til langt på natt. Antrekk: pent, men uformelt. Kom som du er, bare litt finere.</p></div>
 <div class="sec"><h2>{ic("clock",18)}Program</h2><div class="prog"><time>18:00</time><span>Velkomstdrink</span><time>19:00</time><span>Middag</span><time>20:30</time><span>Taler</span><time>21:30</time><span>Quiz</span><time>22:30</time><span>DJ til 01:00</span></div></div>
 <div class="sec"><h2>{ic("pin",18)}Sted</h2><p>Hotel Alexandra, Oslo sentrum. Hotellrom er reservert for gjester som trenger det.</p></div>
 <div class="sec"><h2>{ic("utensils",18)}Meny</h2><p>Tre retter. Vegetar- og allergivennlige alternativer er meldt inn.</p></div>
</div><div class="sticky"><button class="btn btn-s big" style="width:100%;justify-content:center;min-height:48px">{ic("msgplus",18)}Send en forespørsel</button></div></div>'''
def guest_dash(c):
    return f'''<div class="phone m" style="{vars(c)}" lang="nb"><div class="sbar"><span>9:41</span><span></span></div><div class="pt1"><a class="bk" style="padding:0">{ic("back",22)}Festen</a><span></span></div>
<h1 class="lt">Hei, Chris</h1><div class="pin" style="padding-bottom:100px">
 <div class="sec"><h2>Mitt svar</h2><p><b>Ja</b> · 2 personer (med Maria)</p><p class="sub">Maria: vegetar · Hotell: ja</p><a style="color:var(--accent);font-weight:600;font-size:15px;min-height:44px;display:flex;align-items:center">Endre svar</a></div>
 <div class="sec res"><h2>{ic("done",18)}Ordnet for deg</h2><p><b>Henting på flyplassen</b></p><p>Taxi fra OSL kl. 16:30, <time datetime="2026-10-23">fre. 23. okt.</time> Sjåføren venter ved ankomsthallen.</p></div>
 <div class="sec"><h2>Mine forespørsler</h2><div class="req">Kan vi ta med babyen?<div class="rep">{ic("done",15)}<span><b>Leah svarte:</b> Babyer er hjertelig velkomne!</span></div></div></div>
</div><div class="sticky"><button class="btn btn-s big" style="width:100%;justify-content:center;min-height:48px">{ic("msgplus",18)}Send en forespørsel</button></div></div>'''


ED = """.ed{width:640px;max-width:100%;background:var(--card);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.12);padding:22px 24px;color:var(--text);display:flex;flex-direction:column;gap:12px}
.ed h2{margin:0;font-size:22px;letter-spacing:-.01em}.edh{display:flex;justify-content:space-between;align-items:center}
.ai{display:inline-flex;gap:6px;align-items:center;font-size:13px;font-weight:600;color:var(--accent);background:var(--accentSoft);border-radius:9999px;padding:4px 10px}
.edt{border:1px solid var(--input);border-radius:8px;padding:12px 14px;font-size:16px;line-height:1.5}
.src{font-size:13px;color:var(--muted)}.tones{display:flex;gap:8px;flex-wrap:wrap}.tones .btn{font-size:14px;padding:7px 14px}
.edf{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:12px}"""
def editor(c):
    return f'''<div class="ed" style="{vars(c)}"><div class="edh"><h2>About the party</h2><span class="ai">{ic("sparkles",14)}Drafted by Arrangly</span></div>
 <div class="src">Written from your questionnaire, description (“dinner, speeches, a quiz and a DJ. Smart casual”) and the guest program. Language: Norsk.</div>
 <div class="edt" lang="nb">Lørdag 24. oktober fyller Lucas 40, og det skal feires skikkelig! Vi samles på Hotel Alexandra til en kveld med god mat, varme ord og mye latter. Etter velkomstdrinken setter vi oss til en treretters middag, før venner og kolleger hever glasset for jubilanten. Utover kvelden venter en morsom quiz, og når stemningen er på topp tar DJ-en over dansegulvet til langt på natt. Antrekk: pent, men uformelt. Kom som du er, bare litt finere.</div>
 <div class="tones"><button class="btn btn-g">{ic("sparkles",14)}Warmer</button><button class="btn btn-g">{ic("sparkles",14)}Shorter</button><button class="btn btn-g">{ic("sparkles",14)}More formal</button><button class="btn btn-g">Write it myself</button></div>
 <div class="edf"><span class="src">Guests see only the published text, without the ✦ label.</span><button class="btn btn-p">Use this text</button></div></div>'''

def page(fn, title, h1, intro, stages, css):
    open(WS + fn, "w").write(doc(title, h1, intro, "".join(f'<p class="cap" style="text-align:center">{cap}</p><div class="stage">{x}</div>' for cap, x in stages), css))
page("key-all-events-phone.html", "Arrangly Key Screen All Events", "Key screen · All events (Stine, phone, Balanced)",
 "Governs: DESIGN.md › Event card, Create-new-event card, count circle, notification badge · EXPERIENCE.md › Event card + counting rules. Urgent (red + '1 overdue' + new-task badge), at risk (mustard + '2 at risk'), guest-only (RSVP state). Spine wins on conflict.",
 [("Light · Warm Sky  /  Dark · Clear Sky", all_events(LIGHT) + all_events(DARK))], PH)
page("key-task-detail-phone.html", "Arrangly Key Screen Task Detail", "Key screen · Task detail (Stine, phone)",
 "Governs: DESIGN.md › Task detail · EXPERIENCE.md › Task detail, Delegate, ✦ Draft email, KF-2 steps 5–7. Left: just assigned (Accept banner). Right: accepted and Waiting on external, with the bottom action bar. Spine wins on conflict.",
 [("New task  /  Accepted, waiting on hotel", task_detail(LIGHT, False) + task_detail(LIGHT, True))], PH + TD)
page("key-landing-phone.html", "Arrangly Key Screen Guest", "Key screen · Chris's landing page + Guest Dashboard (phone, Norwegian)",
 "Governs: DESIGN.md › Landing page, Guest Dashboard, Send a request · EXPERIENCE.md › Guest experience, KF-3 steps 4–7, Landing page editor (✦ About). Rendered in Norwegian (device language). The Program section is the Run of Show. Spine wins on conflict.",
 [("Leah's editor (desktop excerpt) · ✦ About drafted by Arrangly", editor(LIGHT)), ("Landing page  /  Guest Dashboard", landing(LIGHT) + guest_dash(LIGHT))], PH + TD + LP + ED)
print("phones ok")
