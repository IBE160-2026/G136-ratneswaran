# Shared tokens, CSS and Lucide-style line icons for Arrangly key-screen mocks. Governs: DESIGN.md (all), EXPERIENCE.md Component Patterns.
WS = "/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/.working/"
P = {  # simplified Lucide paths (24x24, stroke)
 "dashboard": '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 "tasks": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
 "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 "timeline": '<path d="M8 6h10"/><path d="M6 12h9"/><path d="M11 18h7"/><path d="M3 3v18"/>',
 "team": '<circle cx="12" cy="8" r="3"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/><circle cx="4.5" cy="10" r="2"/><circle cx="19.5" cy="10" r="2"/>',
 "megaphone": '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 "landing": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 14h8"/><path d="M8 17h5"/>',
 "settings": '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
 "grid": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
 "help": '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
 "alert": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
 "hourglass": '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22"/><path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
 "lock": '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 "done": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
 "minus": '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
 "sparkles": '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
 "check": '<path d="M20 6 9 17l-5-5"/>', "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 "plus": '<path d="M12 5v14"/><path d="M5 12h14"/>', "menu": '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
 "back": '<path d="m15 18-6-6 6-6"/>', "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
 "msgplus": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M8 12h8"/><path d="M12 8v8"/>',
 "pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
 "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', "utensils": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
 "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', "car": '<path d="M19 17h2v-4l-2-5H5L3 13v4h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
 "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>', "chevron": '<path d="m9 18 6-6-6-6"/>',
 "userround": '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>', "list": '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>', "link": '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', "dot": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>', "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>', "diamond": '<path d="M12 2 22 12 12 22 2 12z"/>',
}
def ic(n, s=18, cls=""): return f'<svg class="ic {cls}" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{P[n]}</svg>'

LIGHT = dict(bg="#FAF7F2", card="#FFFFFF", side="#F3EEE6", text="#231F1A", muted="#75695C", line="#EDE6DB", accent="#0066CC", accentFg="#FFFFFF", accentSoft="#E8F1FB",
  done="#1F7A35", waiting="#A04A00", overdue="#C4001A", decision="#7D3C98", decisionSoft="#F4EAF8", blockedRow="#F1ECE4", obsolete="#6E6E73", risk="#9A7A14", riskText="#8A6A00", badge="#D70015", decisionFg="#FFFFFF", input="#8C8175", shadow="0 1px 2px rgba(0,0,0,.05)")
DARK = dict(bg="#000000", card="#1C1C1E", side="#0F0F10", text="#F5F5F7", muted="#98989D", line="#38383A", accent="#4DA3FF", accentFg="#000000", accentSoft="#0B2A4A",
  done="#30D158", waiting="#FF9F0A", overdue="#FF6961", decision="#D08CF2", decisionSoft="#2E1F38", blockedRow="#141416", obsolete="#8E8E93", risk="#E0B84A", riskText="#E0B84A", badge="#D70015", decisionFg="#000000", input="#7C7C80", shadow="none")
def vars(c): return ";".join(f"--{k}:{v}" for k, v in c.items())

BASE = """*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#ECE8E1;color:#231F1A;padding:32px 16px;-webkit-font-smoothing:antialiased}
.page-h{max-width:1180px;margin:0 auto 24px}.page-h h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}.page-h p{margin:0;color:#6e6e73;line-height:1.5;max-width:820px}
.stage{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;align-items:flex-start;margin-bottom:40px}.cap{font-size:12px;color:#6e6e73;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px}
.m{color:var(--text)}.ic{flex:none;display:block}
.win{width:1080px;max-width:100%;border-radius:12px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.12);background:var(--bg);border:1px solid rgba(0,0,0,.08)}
.chrome{height:30px;background:var(--side);border-bottom:1px solid var(--line);display:flex;gap:7px;align-items:center;padding:0 12px}.chrome i{width:12px;height:12px;border-radius:50%;background:#FF5F57}.chrome i:nth-child(2){background:#FEBC2E}.chrome i:nth-child(3){background:#28C840}
.phone{width:375px;flex:none;border-radius:48px;border:12px solid #1d1d1f;background:var(--bg);overflow:hidden;min-height:780px;box-shadow:0 20px 50px rgba(0,0,0,.15);position:relative}
.sbar{display:flex;justify-content:space-between;align-items:center;padding:12px 26px 6px;font-size:15px;font-weight:600}
.pill{border-radius:9999px}.btn{border:0;font:inherit;border-radius:9999px;padding:8px 16px;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.btn-p{background:var(--accent);color:var(--accentFg)}.btn-s{background:var(--accentSoft);color:var(--accent)}.btn-g{background:transparent;color:var(--muted);border:1px solid var(--line)}
.lbl{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;display:flex;gap:8px;align-items:center}
.cnt{background:var(--decision);color:#fff;border-radius:9999px;font-size:11px;padding:1px 8px;letter-spacing:0}.cnt.dim{background:var(--muted);color:var(--card)}
.sub{font-size:13px;color:var(--muted)}.card{background:var(--card);border-radius:var(--r);box-shadow:var(--shadow)}
"""
def doc(title, h1, intro, body, extra_css=""):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<style>{BASE}{extra_css}</style></head><body><div class="page-h"><h1>{h1}</h1><p>{intro}</p></div>{body}</body></html>"""
