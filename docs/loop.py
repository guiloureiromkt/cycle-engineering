import math
stages = ["intent","research","spec","plan","build","test","deploy","maintain"]
gates = {"plan":"five gates","deploy":"release approval"}
cx, cy, r = 300, 215, 150
n = len(stages); pts = []
for i, s in enumerate(stages):
    a = -math.pi/2 + i*2*math.pi/n
    pts.append((s, cx + r*math.cos(a), cy + r*math.sin(a), a))
out = ['<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450" role="img" aria-labelledby="t d">',
 '<title id="t">The Cycle Engineering loop</title>',
 '<desc id="d">Eight stages on a closed ring: intent, research, spec, plan, build, test, deploy, maintain, and back to intent. Plan and deploy are human gates. Evolve sits outside the ring and points at it.</desc>',
 '<style> svg { color: #6e7781; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; } .lbl { font-size: 14px; font-weight: 600; fill: currentColor; text-anchor: middle; dominant-baseline: central; } .sub { font-size: 10.5px; fill: currentColor; text-anchor: middle; } .cap { font-size: 12px; fill: currentColor; } .pill { fill: none; stroke: currentColor; stroke-width: 1.5; } .gate { stroke: #d9772e; stroke-width: 2.5; } .arc { fill: none; stroke: currentColor; stroke-width: 1.5; } .ev { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-dasharray: 5 4; } </style>',
 '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>']
gap = 0.30
for i in range(n):
    a0 = pts[i][3] + gap; a1 = pts[(i+1)%n][3] - gap
    x0, y0 = cx + r*math.cos(a0), cy + r*math.sin(a0); x1, y1 = cx + r*math.cos(a1), cy + r*math.sin(a1)
    out.append(f'<path class="arc" marker-end="url(#ah)" d="M{x0:.1f},{y0:.1f} A{r},{r} 0 0 1 {x1:.1f},{y1:.1f}"/>')
for s, x, y, a in pts:
    cls = "pill gate" if s in gates else "pill"
    out.append(f'<rect class="{cls}" x="{x-40:.1f}" y="{y-13:.1f}" width="80" height="26" rx="13"/>')
    out.append(f'<text class="lbl" x="{x:.1f}" y="{y:.1f}">{s}</text>')
    if s in gates: out.append(f'<text class="sub" x="{x:.1f}" y="{y+26:.1f}">{gates[s]}</text>')
out += ['<rect class="pill" x="478" y="385" width="76" height="26" rx="13"/>','<text class="lbl" x="516" y="398">evolve</text>',
 '<text class="sub" x="516" y="423">watches the method, proposes PRs</text>',
 f'<path class="ev" marker-end="url(#ah)" d="M482,384 Q470,360 {pts[3][1]-10:.1f},{pts[3][2]+30:.1f}"/>',
 '<rect x="24" y="414" width="22" height="12" rx="6" fill="none" stroke="#d9772e" stroke-width="2.5"/>','<text class="cap" x="54" y="424">human gate</text>','</svg>']
open("docs/loop.svg","w").write("\n".join(out)+"\n")
