import re, html, datetime
W = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/"
tpl = open("/Users/aumgaran/Downloads/Arrangly/.claude/skills/bmad-ux/assets/validation-report-template.html").read()
head = tpl[:tpl.index("<body>")].replace("TEMPLATE_UX_SPEC_NAME", "Arrangly")
FIND = re.compile(r"^- \*\*\[?(critical|high|medium|low)\]?\*\*\s*(.+?)(?:\s*\*Fix:\*\s*(.+))?$")
def parse_findings(block):
    out = []
    for line in block.splitlines():
        m = FIND.match(line.strip())
        if m:
            sev, body, fix = m.group(1), m.group(2), m.group(3) or ""
            loc = ""
            lm = re.search(r"\(([^()]*(?:DESIGN|EXPERIENCE|l\.\d|SC )[^()]*)\)\.?\s*$", body)
            if lm: loc = lm.group(1); body = body[:lm.start()].rstrip(" .")
            title = re.split(r"(?<=[.;])\s|\s—\s", body, 1)[0]
            out.append(dict(sev=sev, title=title.strip(), note=body.strip(), loc=loc, fix=fix.strip()))
    return out
md = lambda s: re.sub(r"`([^`]+)`", r"<code>\1</code>", re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", html.escape(s)))
rub = open(W + "review-rubric.md").read(); acc = open(W + "review-accessibility.md").read()
overall = rub.split("## Overall verdict")[1].split("## 1.")[0].strip()
acc_overall = acc.split("## Overall verdict")[1].split("## Findings")[0].strip()
cats = re.findall(r"## (\d)\. (.+?) — (\w+)\n(.*?)(?=\n## \d\. |\n## Mechanical)", rub, re.S)
def art(f):
    return f'''<article class="finding"><header><span class="badge badge-sev-{f["sev"]}">{f["sev"]}</span><h3 class="finding-title">{md(f["title"])}</h3>
<span class="finding-location">{md(f["loc"])}</span></header><div class="finding-note">{md(f["note"])}</div>{f'<div class="finding-fix"><strong>Fix:</strong> {md(f["fix"])}</div>' if f["fix"] else ""}</article>'''
cards, secs, allf = "", "", []
for n, name, verdict, body in cats:
    judg = body.split("### Findings")[0].strip()
    fs = parse_findings(body); allf += [(name, f) for f in fs]
    cards += f'<div class="dim-card"><div class="dim-name">{n}. {name}</div><div class="dim-verdict" style="color: var(--verdict-{verdict})">{verdict}</div></div>'
    secs += f'''<section class="dimension"><details{" open" if verdict in ("thin","broken") else ""}><summary><h2>{n}. {name}</h2><span class="verdict-pill verdict-{verdict}">{verdict}</span></summary>
<div class="dim-body"><div class="dim-judgment">{"".join(f"<p>{md(p)}</p>" for p in judg.split(chr(10)+chr(10)) if p.strip())}</div></div><div class="findings-list">{"".join(art(f) for f in fs)}</div></details></section>'''
afs = parse_findings(acc.split("## Findings")[1].split("## Verified OK")[0]); allf += [("Accessibility", f) for f in afs]
secs += f'''<section class="reviewer-section"><details><summary><h2>Accessibility review</h2><span class="reviewer-source">review-accessibility.md</span></summary>
<div class="dim-body"><div class="dim-judgment">{"".join(f"<p>{md(p)}</p>" for p in acc_overall.split(chr(10)+chr(10)))}</div></div><div class="findings-list">{"".join(art(f) for f in afs)}</div></details></section>'''
mech = [l[2:] for l in rub.split("## Mechanical notes")[1].splitlines() if l.startswith("- ")]
counts = {s: sum(1 for _, f in allf if f["sev"] == s) for s in ("critical","high","medium","low")}
syn = f"<p>{md(overall)}</p><p>The accessibility reviewer ({md(acc_overall.split(chr(10))[0])}) shifts the picture on contrast and keyboard/screen-reader behaviour: it independently found the dark-mode Decide button failing AA, plus a failing badge red, invisible input borders, an unspecified focus ring, a time-limited undo path and an undefined Timeline keyboard model.</p><p>Combined counts: critical {counts['critical']} · high {counts['high']} · medium {counts['medium']} · low {counts['low']}.</p>"
ts = datetime.datetime.now().isoformat(timespec="minutes")
body = f'''<body><div class="container"><header class="report-header"><div class="title"><h1>Arrangly — UX Design Validation Report</h1>
<div class="subtitle">{W}DESIGN.md + EXPERIENCE.md</div></div></header><div class="synthesis">{syn}</div><div class="dimension-summary">{cards}</div>{secs}
<div class="mechanical"><h3>Mechanical notes</h3><ul>{"".join(f"<li>{md(m)}</li>" for m in mech)}</ul></div>
<footer class="report-footer"><div class="meta"><span>Rubric: review-rubric.md</span><span>Accessibility: review-accessibility.md</span><span>Generated: {ts}</span></div></footer></div></body></html>'''
open(W + "validation-report.html", "w").write(head + body)
# markdown twin
lines = [f"# Validation Report — Arrangly\n", f"- **DESIGN.md:** `{W}DESIGN.md`", f"- **EXPERIENCE.md:** `{W}EXPERIENCE.md`", f"- **Run at:** {ts}\n",
         "## Overall verdict\n", overall + "\n", f"Accessibility reviewer: {acc_overall.splitlines()[0]}\n", "## Category verdicts\n"]
lines += [f"- {name} — {v}" for _, name, v, _ in cats] + ["", "## Findings by severity\n"]
for s in ("critical","high","medium","low"):
    fs = [(c, f) for c, f in allf if f["sev"] == s]; lines.append(f"### {s.capitalize()} ({len(fs)})\n")
    for c, f in fs: lines.append(f"**[{c}]** {f['title']}" + (f" (§ {f['loc']})" if f['loc'] else "") + f"\n{f['note']}\n" + (f"Fix: {f['fix']}\n" if f['fix'] else ""))
lines += ["## Reviewer files\n", "- `review-rubric.md`", "- `review-accessibility.md`"]
open(W + "validation-report.md", "w").write("\n".join(lines))
print(counts, "rubric findings parsed:", sum(1 for c,_ in allf if c!="Accessibility"), "a11y parsed:", len(afs))
