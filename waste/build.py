# Per-prospect wrapper pages for the waste-quote pitch demo.
# Each page carries the WhatsApp link preview + open beacon, then forwards to the
# branded Worker. Keeps "honest-misty-photo-reader.workers.dev" out of the message.
import html, json, sys, urllib.parse
sys.path.insert(0, '/Users/leesherriff/postcard-deploy')
from add_beacon import snippet

WORKER = 'https://waste-quote.honest-misty-photo-reader.workers.dev/'
PROSPECTS = [
    ('clr-property-clearance', 'Clr Property Clearance & Maintenance', 'Port Talbot', '07539 161255'),
    ('briton-ferry-waste', 'Briton Ferry Waste Management', 'Briton Ferry', '07729 351033'),
    ('sm-waste-removals', 'S&M Waste Removals', 'Bridgend', '07981 165549'),
    ('ricks-rubbish-removals', "Rick's Rubbish Removals", 'Pyle', '07495 734978'),
    ('van-about-town', 'Van About Town', 'Bridgend', '07398 167288'),
    ('clear-out-4-you', 'Clear Out 4 You', 'Porthcawl', '07896 426667'),
    ('swansea-waste-removals', 'Swansea Waste Removals & Rubbish Clearance', 'Swansea', '07460 492690'),
    ('west-wales-rubbish', 'West Wales Rubbish Removals', 'Llanelli', '07740 179232'),
    ('allgone-waste-merthyr', 'ALLGONE Waste Management', 'Merthyr Tydfil', '07908 388064'),
    ('a-edwards-rubbish', 'A Edwards Rubbish Removal', 'Tonypandy', '07545 154576'),
    ('ethical-waste-cardiff', 'Ethical Waste Management and Removals', 'Cardiff', '07857 754612'),
    ('richards-clearance', 'CE & N Richards House & Garden Clearance', 'Carmarthen', '07980 989223'),
    ('harris-metals-waste', 'Harris Metals and Waste Removals', 'Newport', '07534 686774'),
    ('gf-waste-barry', 'G.F Waste Collection', 'Barry', '07462 011176'),
    ('williams-waste-llanelli', 'Williams Waste Disposal and Garden Services', 'Llanelli', '07376 958999'),
]

for slug, name, town, phone in PROSPECTS:
    target = WORKER + '?' + urllib.parse.urlencode({'name': name, 'town': town, 'phone': phone}, quote_via=urllib.parse.quote)
    n, t = html.escape(name), html.escape(town)
    page = f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{n} · Photo quote</title>
<meta property="og:type" content="website">
<meta property="og:title" content="{n} · Photo quote">
<meta property="og:description" content="Snap your rubbish, get a price in seconds — built for {n} in {t}.">
<meta property="og:image" content="{WORKER}img/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>body{{margin:0;background:#101412;color:#e8ece9;font:16px system-ui;display:grid;place-items:center;min-height:100vh}}a{{color:#c6f24e}}</style>
</head><body>
<p>Opening your photo quote… <a href="{html.escape(target)}">tap here</a> if it doesn't.</p>
{snippet('hello-waste-' + slug + '.html')}<script>setTimeout(function(){{location.replace({json.dumps(target + '&x=' if False else target)})}},250)</script>
</body></html>
'''
    open(f'{slug}.html', 'w').write(page)
    print(slug, len(page))
