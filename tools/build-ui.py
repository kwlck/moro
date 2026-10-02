from pathlib import Path
import json
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
class TreeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tree=[];self.stack=[self.tree]
    def handle_starttag(self,tag,attrs):
        tag={'fegaussianblur':'feGaussianBlur','fecolormatrix':'feColorMatrix'}.get(tag,tag)
        names={'viewbox':'viewBox','filterunits':'filterUnits','maskunits':'maskUnits','stddeviation':'stdDeviation'}
        node={'tag':tag,'attrs':{names.get(k,k):v or '' for k,v in attrs},'children':[]}
        self.stack[-1].append(node)
        if tag not in ['input','br','img','hr','meta','link']:self.stack.append(node['children'])
    def handle_endtag(self,tag):
        if len(self.stack)>1:self.stack.pop()
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in ['input','br','img','hr','meta','link']:self.handle_endtag(tag)
    def handle_data(self,data):self.stack[-1].append(data)
parser=TreeParser();parser.feed((root/'ui/overlay.html').read_text(encoding='utf-8'))
(root/'ui/overlay-tree.json').write_text(json.dumps(parser.tree,ensure_ascii=False),encoding='utf-8')
