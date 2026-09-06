"""Dependency-free structural and policy regression checks for the static site."""
import re
import subprocess
import unittest
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob('*.html')) + sorted((ROOT / 'pages').glob('*.html'))
REQUIRED_DATA = ('site-config.js', 'announcements.js', 'gallery.js', 'navigation.js', 'content.js')
APPROVED_HOSTS = {'www.netc.navy.mil', 'www.bethel.k12.ct.us', 'calendar.google.com'}

class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.starts=[]; self.ids=[]; self.refs=[]; self.mounts=[]; self.text=[]
    def handle_decl(self, decl): self.starts.append(('doctype', decl.lower()))
    def handle_starttag(self, tag, attrs):
        values=dict(attrs); self.starts.append((tag, values))
        if 'id' in values: self.ids.append(values['id'])
        for key in ('data-site-header','data-site-footer'):
            if key in values: self.mounts.append(key)
        target=values.get('href') if tag in ('a','link') else values.get('src') if tag in ('img','script','iframe') else None
        if target: self.refs.append((tag,target))
    def handle_data(self, data): self.text.append(data)

class SiteTests(unittest.TestCase):
    def parse(self, path):
        parser=DocumentParser(); parser.feed(path.read_text(encoding='utf-8')); return parser

    def test_team_cards_have_dedicated_structural_pages(self):
        content=(ROOT/'data/content.js').read_text(encoding='utf-8')
        teams_body=re.search(r"\bteams:\s*\[(.*?)\n\s*\]",content,re.S).group(1)
        records=re.findall(r"\{[^{}]*\}",teams_body)
        expected={
            'drill': 'pages/drill-and-ceremony.html',
            'fitness': 'pages/athletics-and-fitness.html',
            'academics': 'pages/academic-teams.html',
            'service': 'pages/community-service.html',
        }
        enabled_ids={
            re.search(r"\bid:\s*'([^']+)'",record).group(1)
            for record in records if re.search(r"\benabled:\s*true\b",record)
        }
        self.assertEqual(set(expected),enabled_ids)

        for content_id, expected_url in expected.items():
            with self.subTest(id=content_id,url=expected_url):
                matches=[record for record in records if re.search(rf"\bid:\s*'{re.escape(content_id)}'",record)]
                self.assertEqual(len(matches),1,f'expected exactly one {content_id} teams entry')
                url=re.search(r"\burl:\s*'([^']+)'",matches[0]).group(1)
                self.assertEqual(url,expected_url)

                path=ROOT/url
                self.assertTrue(path.exists(),f'missing team page: {path}')
                parser=self.parse(path); tags=[item[0] for item in parser.starts]
                for name in ('doctype','html','head','body','main'):
                    self.assertEqual(tags.count(name),1,f'{path}: expected one {name}')
                self.assertEqual(parser.mounts.count('data-site-header'),1)
                self.assertEqual(parser.mounts.count('data-site-footer'),1)
                self.assertEqual(parser.ids.count('main-content'),1)
                self.assertEqual(len(parser.ids),len(set(parser.ids)),f'{path}: duplicate HTML id')
                self.assertIn(('a','teams.html'),parser.refs)

    def test_drill_program_cards_have_dedicated_content_pages(self):
        content=(ROOT/'data/content.js').read_text(encoding='utf-8')
        match=re.search(r"\bdrillPrograms:\s*\[(.*?)\n\s*\]",content,re.S)
        self.assertIsNotNone(match,'missing drillPrograms collection')
        records=re.findall(r"\{[^{}]*\}",match.group(1))
        expected=[
            ('color-guard','pages/color-guard.html'),
            ('drill-team','pages/drill-team.html'),
            ('unarmed-drill','pages/unarmed-drill.html'),
            ('armed-drill','pages/armed-drill.html'),
            ('unarmed-exhibition','pages/unarmed-exhibition.html'),
            ('armed-exhibition','pages/armed-exhibition.html'),
        ]
        actual=[]; orders=[]
        for record in records:
            self.assertRegex(record,r"\benabled:\s*true\b")
            actual.append((re.search(r"\bid:\s*'([^']+)'",record).group(1),re.search(r"\burl:\s*'([^']+)'",record).group(1)))
            orders.append(int(re.search(r"\border:\s*(\d+)",record).group(1)))
        self.assertEqual(actual,expected)
        self.assertEqual(orders,sorted(set(orders)))

        teams=re.search(r"\bteams:\s*\[(.*?)\n\s*\]",content,re.S).group(1)
        self.assertFalse(any(content_id in re.findall(r"\bid:\s*'([^']+)'",teams) for content_id,_ in expected))

        for content_id,url in expected:
            with self.subTest(id=content_id,url=url):
                path=ROOT/url
                self.assertTrue(path.exists(),f'missing drill program page: {path}')
                parser=self.parse(path); tags=[item[0] for item in parser.starts]
                for name in ('doctype','html','head','body','main'):
                    self.assertEqual(tags.count(name),1,f'{path}: expected one {name}')
                self.assertEqual(parser.mounts.count('data-site-header'),1)
                self.assertEqual(parser.mounts.count('data-site-footer'),1)
                self.assertEqual(parser.ids.count('main-content'),1)
                self.assertIn(('a','drill-and-ceremony.html'),parser.refs)
                self.assertGreaterEqual(tags.count('h1'),1)
                visible=' '.join(' '.join(parser.text).split()).lower()
                self.assertNotIn('more information is coming',visible)
                self.assertGreater(len(visible),180)

        parent=(ROOT/'pages/drill-and-ceremony.html').read_text(encoding='utf-8')
        self.assertEqual(len(re.findall(r'data-content=["\']drillPrograms["\']',parent)),1)

    def test_fitness_programs_are_complete_and_unique(self):
        content=(ROOT/'data/content.js').read_text(encoding='utf-8')
        match=re.search(r"\bfitnessPrograms:\s*\[(.*?)\n\s*\]",content,re.S)
        self.assertIsNotNone(match,'missing fitnessPrograms collection')
        records=re.findall(r"\{[^{}]*\}",match.group(1))
        expected=[
            ('pt-team','pages/pt-team.html'),
            ('physical-fitness-assessments','pages/physical-fitness-assessments.html'),
            ('klondike-derby','pages/klondike-derby.html'),
        ]
        actual=[(re.search(r"\bid:\s*'([^']+)'",r).group(1),re.search(r"\burl:\s*'([^']+)'",r).group(1)) for r in records]
        self.assertEqual(actual,expected)
        self.assertEqual(len(records),3)
        self.assertTrue(all(re.search(r'\benabled:\s*true\b',r) for r in records))
        orders=[int(re.search(r'\border:\s*(\d+)',r).group(1)) for r in records]
        self.assertEqual(orders,sorted(set(orders)))
        parent=(ROOT/'pages/athletics-and-fitness.html').read_text(encoding='utf-8')
        self.assertEqual(len(re.findall(r'data-content=["\']fitnessPrograms["\']',parent)),1)
        self.assertIn('Fitness Competitions',parent)

    def test_fitness_pages_encode_confirmed_unit_behavior(self):
        expected=['pt-team','physical-fitness-assessments','klondike-derby']
        for name in expected:
            path=ROOT/'pages'/f'{name}.html'; self.assertTrue(path.exists(),path)
            parser=self.parse(path); tags=[tag for tag,_ in parser.starts]
            self.assertEqual(tags.count('h1'),1); self.assertEqual(tags.count('figure'),0)
            self.assertIn(('a','athletics-and-fitness.html'),parser.refs)
            self.assertNotIn('more information is coming',' '.join(parser.text).lower())
        assessment=(ROOT/'pages/physical-fitness-assessments.html').read_text().lower()
        self.assertNotIn('et assessment',assessment)
        for phrase in ('curl-ups','push-ups','one-mile run','plank','fall pt assessment','spring pt assessment'):
            self.assertIn(phrase,assessment)
        self.assertIn('crm, pp. 47–49',assessment)
        derby=' '.join(self.parse(ROOT/'pages/klondike-derby.html').text).lower()
        positions=[derby.index(term) for term in ('sled pull','fence obstacle','field run','snowman build','return run','air-rifle marksmanship')]
        self.assertEqual(positions,sorted(positions)); self.assertIn('four teams',derby); self.assertIn('alpha',derby); self.assertIn('bravo',derby)

    def test_fitness_visuals_are_unique_accessible_and_motion_safe(self):
        fitness_pages = {'athletics-and-fitness', 'pt-team', 'physical-fitness-assessments', 'klondike-derby'}
        self.assertEqual(list((ROOT / 'assets/fitness').glob('*.svg')), [])
        for name in fitness_pages:
            parser = self.parse(ROOT / 'pages' / f'{name}.html')
            images = [attrs for tag, attrs in parser.starts if tag == 'img' and '/fitness/' in attrs.get('src', '')]
            hooks = [attrs for tag, attrs in parser.starts if tag == 'figure' and 'data-program-visual' in attrs]
            self.assertEqual(images, [], name)
            self.assertEqual(hooks, [], name)

    def test_fitness_standards_have_checked_in_crm_provenance(self):
        reference=ROOT/'references/crm-3rd_edition-fitness.txt'
        self.assertTrue(reference.exists())
        source=reference.read_text(encoding='utf-8')
        page=(ROOT/'pages/physical-fitness-assessments.html').read_text(encoding='utf-8')
        for marker in ('PRINTED PAGE 47','PRINTED PAGE 48','PRINTED PAGE 49','The manual does not include a plank'):
            self.assertIn(marker,source)
        for value in ('73','96','11:40','6:06'):
            self.assertIn(f'>{value}<',page)
        parser=self.parse(ROOT/'pages/physical-fitness-assessments.html')
        tags=[tag for tag,_ in parser.starts]
        self.assertEqual(tags.count('table'),3)
        self.assertEqual(tags.count('caption'),3)
        self.assertGreaterEqual(tags.count('th'),30)

    def test_every_html_has_one_document_and_shared_regions(self):
        for path in HTML_FILES:
            with self.subTest(path=path):
                parser=self.parse(path); tags=[item[0] for item in parser.starts]
                for name in ('doctype','html','head','body','main'):
                    self.assertEqual(tags.count(name),1, f'{path}: expected one {name}')
                self.assertEqual(parser.mounts.count('data-site-header'),1)
                self.assertEqual(parser.mounts.count('data-site-footer'),1)

    def test_home_ids_and_mounts_are_unique(self):
        parser=self.parse(ROOT/'index.html')
        self.assertEqual(len(parser.ids),len(set(parser.ids)))
        for mount in ('data-site-header','data-site-footer'):
            self.assertEqual(parser.mounts.count(mount),1)
        text=(ROOT/'index.html').read_text()
        for dynamic in ('data-announcements','data-calendar','data-countdown','data-quick-links'):
            self.assertLessEqual(text.count(dynamic),1)

    def test_local_targets_exist_and_paths_do_not_escape(self):
        for path in HTML_FILES:
            for _, target in self.parse(path).refs:
                clean=urlsplit(target)
                if clean.scheme:
                    continue
                self.assertFalse(target.startswith(('/', '//')), f'{path}: root path {target}')
                relative=clean.path
                if not relative: continue
                resolved=(path.parent/relative).resolve()
                self.assertTrue(resolved.is_relative_to(ROOT), f'{path}: traversal {target}')
                self.assertTrue(resolved.exists(), f'{path}: missing {target}')

    def test_data_loads_before_application(self):
        for path in HTML_FILES:
            scripts=[target for tag,target in self.parse(path).refs if tag=='script']
            app=next(i for i,target in enumerate(scripts) if target.endswith('script.js') and not target.endswith('weather.js'))
            for required in REQUIRED_DATA:
                self.assertTrue(any(target.endswith(required) for target in scripts[:app]), f'{path}: {required} must load first')

    def test_navigation_and_content_ids_and_orders(self):
        nav=(ROOT/'data/navigation.js').read_text(); content=(ROOT/'data/content.js').read_text()
        nav_ids=re.findall(r"\bid:\s*'([^']+)'",nav); self.assertEqual(len(nav_ids),len(set(nav_ids)))
        for name, body in re.findall(r"(\w+):\s*\[(.*?)\n\s*\]",content,re.S):
            ids=re.findall(r"\bid:\s*'([^']+)'",body); self.assertEqual(len(ids),len(set(ids)),name)
        # Each sibling collection has strictly increasing, non-repeated order values.
        top_orders=[int(value) for value in re.findall(r"^  \{ id:.*?order: (\d+)",nav,re.M)]
        self.assertEqual(top_orders,sorted(set(top_orders)))
        for body in re.findall(r"children: \[(.*?)\n  \]",nav,re.S):
            orders=[int(value) for value in re.findall(r"order: (\d+)",body)]
            self.assertEqual(orders,sorted(set(orders)))
        for body in re.findall(r"\w+: \[(.*?)\n  \]",content,re.S):
            orders=[int(value) for value in re.findall(r"order: (\d+)",body)]
            self.assertEqual(orders,sorted(set(orders)))

    def test_external_links_are_https_and_approved(self):
        files=HTML_FILES+list((ROOT/'data').glob('*.js'))
        for path in files:
            for url in re.findall(r"https?://[^'\"\s<]+",path.read_text()):
                parsed=urlsplit(url.rstrip('.,')); self.assertEqual(parsed.scheme,'https',f'{path}: {url}')
                self.assertIn(parsed.hostname,APPROVED_HOSTS,f'{path}: {url}')

    def test_official_school_contacts_are_published_consistently(self):
        config=(ROOT/'data/site-config.js').read_text(encoding='utf-8')
        contact=(ROOT/'pages/contact.html').read_text(encoding='utf-8')
        wellness=(ROOT/'pages/wellness.html').read_text(encoding='utf-8')
        content=(ROOT/'data/content.js').read_text(encoding='utf-8')
        for value in ('203-794-8600','300 Whittlesey Drive','Bethel, CT 06801'):
            self.assertIn(value,config)
            self.assertIn(value,contact)
        for name,email in (
            ('Michael Ipkovich','ipkovichm@bethel.k12.ct.us'),
            ('John Meehan','meehanj@bethel.k12.ct.us'),
        ):
            self.assertIn(name,config)
            self.assertIn(email,config)
            self.assertIn(name,contact)
            self.assertIn(email,contact)
            self.assertIn(name,content)
        self.assertIn('Bethel High School Counseling Office',wellness)
        self.assertIn('203-794-8600',wellness)
        self.assertNotIn('Verified contacts pending',wellness)
        self.assertNotIn('Verification required',contact)

    def test_javascript_syntax_and_single_renderers(self):
        subprocess.run(['node','--check','script.js'],cwd=ROOT,check=True,capture_output=True,text=True)
        source=(ROOT/'script.js').read_text()
        for name in ('safeUrl','element','link','renderHeader','renderFooter','initializeTheme','closeMobile','renderCollection','renderAnnouncements','renderQuickLinks','renderCountdown','renderCalendar','renderGallery','renderCurrentYear'):
            self.assertEqual(len(re.findall(rf'function\s+{name}\s*\(',source)),1,name)
        for name in ('root','base','page','config','content','identity'):
            self.assertEqual(len(re.findall(rf'\bconst\s+{name}\b',source)),1,name)

    def test_unit_mark_is_one_svg(self):
        path=ROOT/'assets/unit-mark.svg'; root=ET.parse(path).getroot()
        self.assertEqual(root.tag,'{http://www.w3.org/2000/svg}svg')
        self.assertEqual(sum(1 for node in root.iter() if node.tag=='{http://www.w3.org/2000/svg}svg'),1)

    def test_every_page_has_unique_html_ids(self):
        for path in HTML_FILES:
            with self.subTest(path=path):
                parser=self.parse(path)
                self.assertEqual(len(parser.ids),len(set(parser.ids)),f'{path}: duplicate HTML id')

    def test_raw_reference_is_not_deployed_or_referenced(self):
        self.assertFalse((ROOT/'Screenshot_20260905_153726_Gmail.jpg').exists())
        for path in HTML_FILES+[ROOT/'styles.css',ROOT/'script.js',ROOT/'weather.js',*list((ROOT/'data').glob('*.js'))]:
            self.assertNotIn('Screenshot_20260905_153726_Gmail.jpg',path.read_text())

    def test_themes_have_complete_semantic_tokens(self):
        css=(ROOT/'styles.css').read_text(); required={'page-bg','surface-raised','surface-deep','text-primary','text-secondary','text-heading','border','interaction','interaction-active','gold','focus','warning','grid','glow','shadow'}
        dark=re.search(r':root\{(.*?)\}',css,re.S).group(1); light=re.search(r':root\[data-theme="light"\]\{(.*?)\}',css,re.S).group(1)
        for block in (dark,light): self.assertEqual(required,{*re.findall(r'--([\w-]+)\s*:',block)})

    def test_collection_cards_are_responsive_native_links(self):
        css=(ROOT/'styles.css').read_text(); script=(ROOT/'script.js').read_text()
        self.assertRegex(css,r':focus-visible\s*\{[^}]*outline:',':focus-visible styling must remain visible')
        grid=re.search(r'\.card-grid,\[data-content\][^{]*\{([^}]*)\}',css,re.S).group(1)
        self.assertIn('repeat(auto-fit,minmax(',grid)
        card=re.search(r'\.card,.content-card[^}]*\{([^}]*)\}',css,re.S).group(1)
        self.assertRegex(card,r'min-height:\s*44px')
        renderer=re.search(r'function renderCollection\(mount\) \{(.*?)\n  \}',script,re.S).group(1)
        self.assertIn("element(record.url ? 'a' : 'article', 'card')",renderer)
        self.assertNotRegex(renderer,r"element\(['\"](?:button|input|select|textarea)['\"]")

    def test_drill_visual_guides_are_unique_accessible_and_motion_safe(self):
        expected={
            'drill-and-ceremony.html': 'drill-overview.svg',
            'color-guard.html': 'color-guard.jpg',
            'drill-team.html': 'drill-team.svg',
            'unarmed-drill.html': 'unarmed-drill.jpg',
            'armed-drill.html': 'armed-drill.jpg',
            'unarmed-exhibition.html': 'unarmed-exhibition.svg',
            'armed-exhibition.html': 'armed-exhibition.svg',
        }
        referenced=[]
        for page,asset in expected.items():
            with self.subTest(page=page,asset=asset):
                parser=self.parse(ROOT/'pages'/page)
                matches=[target for tag,target in parser.refs if tag=='img' and target==f'../assets/drill/{asset}']
                self.assertEqual(len(matches),1)
                image_tags=[attrs for tag,attrs in parser.starts if tag=='img' and attrs.get('src')==matches[0]]
                self.assertEqual(len(image_tags),1)
                self.assertTrue(image_tags[0].get('alt','').strip())
                self.assertEqual(image_tags[0].get('loading'),'lazy')
                self.assertIn('figure',[tag for tag,_ in parser.starts])
                self.assertIn('figcaption',[tag for tag,_ in parser.starts])
                referenced.extend(matches)

                if not asset.endswith('.svg'): continue
                svg_path=ROOT/'assets'/'drill'/asset
                self.assertTrue(svg_path.exists())
                svg=svg_path.read_text(encoding='utf-8')
                root=ET.fromstring(svg)
                ns='{http://www.w3.org/2000/svg}'
                self.assertEqual(root.tag,f'{ns}svg')
                titles=root.findall(f'{ns}title'); descriptions=root.findall(f'{ns}desc')
                self.assertEqual(len(titles),1)
                self.assertEqual(len(descriptions),1)
                labelled_by=root.get('aria-labelledby','').split()
                self.assertEqual(labelled_by,[titles[0].get('id'),descriptions[0].get('id')])
                self.assertNotIn('TEXT',''.join(root.itertext()))
                self.assertIn('@keyframes',svg)
                self.assertIn('prefers-reduced-motion: reduce',svg)
                ids=re.findall(r'\bid="([^"]+)"',svg)
                self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(len(referenced),len(set(referenced)))

        css=(ROOT/'styles.css').read_text(encoding='utf-8')
        self.assertRegex(css,r'\.visual-guide\s*\{[^}]*grid-template-columns:',re.S)
        self.assertRegex(css,r'\.visual-guide img\s*\{[^}]*max-width:\s*100%')
        drill_pages = {'drill-and-ceremony', 'color-guard', 'drill-team', 'unarmed-drill', 'armed-drill', 'unarmed-exhibition', 'armed-exhibition'}
        for name in drill_pages:
            source = (ROOT / 'pages' / f'{name}.html').read_text()
            self.assertNotRegex(source, r'<(?:img|picture|svg)\b[^>]*(?:/drill/|data-program-visual)', name)

    def drill_records(self):
        source=(ROOT/'data/content.js').read_text(encoding='utf-8')
        body=re.search(r"\bdrillPrograms:\s*\[(.*?)\n\s*\]",source,re.S).group(1)
        return re.findall(r"\{[^{}]*\}",body)

    def test_rendering_twice_does_not_duplicate_shared_regions(self):
        source=(ROOT/'script.js').read_text(encoding='utf-8')
        self.assertIn('function replaceMountContent(',source)
        for renderer in ('renderHeader','renderFooter','renderAnnouncements','renderQuickLinks','renderCountdown','renderCalendar','renderGallery'):
            body=re.search(rf'function {renderer}\([^)]*\)\s*\{{(.*?)(?=\n  function |\n\}}\)\(\);)',source,re.S).group(1)
            self.assertIn('replaceMountContent(',body,renderer)
        self.assertEqual(source.count('initialize();'),1)
        self.assertIn("document.documentElement.dataset.siteListenersBound",source)

    def test_rendering_twice_does_not_duplicate_drill_cards(self):
        source=(ROOT/'script.js').read_text(encoding='utf-8')
        body=re.search(r'function renderCollection\(mount\) \{(.*?)\n  \}',source,re.S).group(1)
        self.assertIn('new Map',body)
        self.assertIn('replaceMountContent(',body)
        self.assertIn("element(record.url ? 'a' : 'article', 'card')",body)
        self.assertNotRegex(body,r"element\(['\"](?:button|input|select|textarea)['\"]")

    def test_drill_collection_contains_exactly_six_unique_programs(self):
        records=self.drill_records(); self.assertEqual(len(records),6)
        for field in ('id','title','url'):
            values=[re.search(rf"\b{field}:\s*'([^']+)'",r).group(1) for r in records]
            self.assertEqual(len(values),len(set(values)),field)
        orders=[int(re.search(r'\border:\s*(\d+)',r).group(1)) for r in records]
        self.assertEqual(orders,sorted(set(orders)))
        self.assertTrue(all(re.search(r'\benabled:\s*true\b',r) for r in records))

    def test_each_drill_page_has_one_distinct_visual(self):
        drill_pages = {'drill-and-ceremony', 'color-guard', 'drill-team', 'unarmed-drill', 'armed-drill', 'unarmed-exhibition', 'armed-exhibition'}
        for name in drill_pages:
            parser = self.parse(ROOT / 'pages' / f'{name}.html')
            images = [attrs for tag, attrs in parser.starts if tag == 'img' and '/drill/' in attrs.get('src', '')]
            self.assertEqual(images, [], name)

    def test_drill_visuals_are_accessible_and_motion_safe(self):
        self.assertEqual(list((ROOT / 'assets/drill').glob('*.svg')), [])

    def test_program_animation_controller_is_idempotent_and_one_shot(self):
        source = (ROOT / 'script.js').read_text(encoding='utf-8')
        css = (ROOT / 'styles.css').read_text(encoding='utf-8')
        self.assertNotIn('initializeProgramVisuals', source)
        self.assertNotIn('data-program-visual', source)
        self.assertNotIn('data-program-visual', css)
        self.assertNotIn('.drill-visual', css)
        self.assertNotIn('.program-visual', css)

    def test_drill_detail_copy_is_not_repeated(self):
        for path in sorted((ROOT/'pages').glob('*.html')):
            if path.stem not in {'color-guard','drill-team','unarmed-drill','armed-drill','unarmed-exhibition','armed-exhibition'}: continue
            parser=self.parse(path); tags=[tag for tag,_ in parser.starts]
            self.assertEqual(tags.count('h1'),1); self.assertEqual(tags.count('figure'),0)
            self.assertEqual(sum(1 for tag,attrs in parser.starts if isinstance(attrs,dict) and 'program-overview' in attrs.get('class','').split()),1)
            blocks=[' '.join(t.split()).lower() for t in re.findall(r'<(?:p|figcaption)[^>]*>(.*?)</(?:p|figcaption)>',path.read_text(),re.S) if len(' '.join(t.split()))>25]
            for i,left in enumerate(blocks):
                for right in blocks[i+1:]: self.assertLess(SequenceMatcher(None,left,right).ratio(),.72,path)

    def test_drill_pages_have_one_complete_document(self):
        for path in sorted((ROOT/'pages').glob('*.html')):
            if path.stem not in {'drill-and-ceremony','color-guard','drill-team','unarmed-drill','armed-drill','unarmed-exhibition','armed-exhibition'}: continue
            parser=self.parse(path); tags=[tag for tag,_ in parser.starts]
            for tag in ('doctype','html','head','body','main'): self.assertEqual(tags.count(tag),1,(path,tag))
            self.assertEqual(parser.ids.count('main-content'),1); self.assertEqual(parser.mounts.count('data-site-header'),1); self.assertEqual(parser.mounts.count('data-site-footer'),1)
            scripts=[ref for tag,ref in parser.refs if tag=='script' and ref.endswith('script.js')]
            self.assertEqual(len(scripts),1,path)
        parent=(ROOT/'pages/drill-and-ceremony.html').read_text(); self.assertEqual(len(re.findall(r'data-content=["\']drillPrograms["\']',parent)),1)

    def test_all_drill_links_and_assets_resolve(self):
        paths=[ROOT/'pages'/f'{name}.html' for name in ('drill-and-ceremony','color-guard','drill-team','unarmed-drill','armed-drill','unarmed-exhibition','armed-exhibition')]
        for path in paths:
            parser=self.parse(path); self.assertEqual(len(parser.ids),len(set(parser.ids)),path)
            for _,target in parser.refs:
                clean=urlsplit(target)
                if clean.scheme: continue
                if clean.path: self.assertTrue((path.parent/clean.path).resolve().exists(),(path,target))
            source=path.read_text(); self.assertFalse(re.search(r'<a\b[^>]*>.*?<(?:a|button|input|select|textarea)\b',source,re.S|re.I),path)
        all_source='\n'.join(p.read_text(errors='ignore') for p in [*HTML_FILES,ROOT/'script.js',ROOT/'styles.css',*ROOT.glob('data/*.js'),*ROOT.glob('assets/drill/*.svg')])
        self.assertFalse(any(x in all_source for x in ('<<<<<<<','=======','>>>>>>>','PLACEHOLDER')))
        raster_assets={
            path.name
            for extension in ('*.png','*.jpg','*.jpeg','*.webp','*.gif')
            for path in (ROOT/'assets/drill').glob(extension)
        }
        self.assertEqual(raster_assets,{'armed-drill.jpg','color-guard.jpg','unarmed-drill.jpg'})

    def test_drill_photos_have_approved_content_and_interactions(self):
        expected={
            'armed-drill': ('armed-drill.jpg','Cadet Gavin Kopreski commands the armed platoon as Cadet Toshan Bhattacharya serves as the unit guidon during the Brewster Drill Meet in Brewster, New York, on December 13, 2025.'),
            'color-guard': ('color-guard.jpg','Cadets Michael Connors, Audrey Steele, Luke White, and Nolan Shaw present the colors while marching for the Tunnel to Towers Foundation at the Bethel High School track in Bethel, Connecticut, on June 28, 2026.'),
            'unarmed-drill': ('unarmed-drill.jpg','Cadet Gavin Kopreski commands the unarmed platoon during the Washington Drill Meet in Washingtonville, New York, on November 8, 2025.'),
        }
        for page,(asset,caption) in expected.items():
            parser=self.parse(ROOT/'pages'/f'{page}.html')
            photos=[attrs for tag,attrs in parser.starts if tag=='img' and attrs.get('src')==f'../assets/drill/{asset}']
            self.assertEqual(len(photos),1,page); self.assertTrue(photos[0].get('alt','').strip())
            figures=[attrs for tag,attrs in parser.starts if tag=='figure' and 'photo-visual' in attrs.get('class','').split()]
            self.assertEqual(len(figures),1,page); self.assertEqual(figures[0].get('tabindex'),'0'); self.assertIn('data-photo-visual',figures[0])
            self.assertIn(caption,' '.join(self.parse(ROOT/'pages'/f'{page}.html').text))
        css=(ROOT/'styles.css').read_text(); script=(ROOT/'script.js').read_text()
        self.assertIn('12s linear infinite',css); self.assertIn('.photo-visual.is-selected',css)
        self.assertIn("querySelectorAll('[data-photo-visual]')",script)

    def test_no_merge_markers(self):
        workflow_files=list((ROOT/'.github'/'workflows').glob('*.yml'))+list((ROOT/'.github'/'workflows').glob('*.yaml'))
        checked=[*HTML_FILES,ROOT/'script.js',ROOT/'weather.js',ROOT/'styles.css',ROOT/'README.md',*list((ROOT/'data').glob('*.js')),*workflow_files]
        self.assertEqual(len(checked),len(set(checked)))
        for path in checked:
            self.assertFalse(any(marker in path.read_text() for marker in ('<<<<<<<','=======','>>>>>>>')),path)

if __name__ == '__main__': unittest.main()
