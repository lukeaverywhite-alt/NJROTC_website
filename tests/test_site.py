"""Dependency-free structural and policy regression checks for the static site."""
import re
import subprocess
import unittest
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
        super().__init__(convert_charrefs=True); self.starts=[]; self.ids=[]; self.refs=[]; self.mounts=[]
    def handle_decl(self, decl): self.starts.append(('doctype', decl.lower()))
    def handle_starttag(self, tag, attrs):
        values=dict(attrs); self.starts.append((tag, values))
        if 'id' in values: self.ids.append(values['id'])
        for key in ('data-site-header','data-site-footer'):
            if key in values: self.mounts.append(key)
        target=values.get('href') if tag in ('a','link') else values.get('src') if tag in ('img','script','iframe') else None
        if target: self.refs.append((tag,target))

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

    def test_no_merge_markers(self):
        for path in [*HTML_FILES,ROOT/'script.js',ROOT/'styles.css',*list((ROOT/'data').glob('*.js'))]:
            self.assertFalse(any(marker in path.read_text() for marker in ('<<<<<<<','=======','>>>>>>>')),path)

if __name__ == '__main__': unittest.main()
