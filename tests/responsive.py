from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public'
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','').replace('<script defer src="app.js"></script>','').replace('<link rel="icon" href="icon.svg">','')
css=(root/'style.css').read_text(); js=(root/'app.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w in [320,390,768,1024,1440]:
  page=b.new_page(viewport={'width':w,'height':900},reduced_motion='reduce',has_touch=w<=390)
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate('''() => {const mem={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=v}});window.fetch=async()=>({ok:true,json:async()=>({result:'success',rates:{USD:1,RUB:90,EUR:.9},time_last_update_unix:1795500000})})}''')
  page.add_script_tag(content=js);page.wait_for_timeout(100);page.get_by_role('button',name='Посмотреть пример').click()
  for name in ['home','all','collections','favorites','bought','stats','settings']:
   page.evaluate(f"go('{name}')");page.wait_for_timeout(40)
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow {w} {name}'
  page.evaluate("go('home')");page.wait_for_timeout(100)
  page.locator('#top-add').click();assert page.locator('dialog').is_visible();assert page.locator('dialog').get_attribute('aria-labelledby')=='modal-title';assert page.evaluate('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth+1'),f'overflow modal {w}'
  if w==1440: page.screenshot(path=str(root.parent/'form-test.png'))
  page.keyboard.press('Escape');assert not page.locator('dialog').is_visible()
  page.locator('.product-title').first.click();assert page.locator('dialog').is_visible();assert page.locator('.detail-photo .demo-art').count()==1;page.keyboard.press('Escape');
  page.evaluate("window.scrollTo(0,0);document.getElementById('toast').classList.remove('show')");page.mouse.move(0,0)
  if w in (390,1440): page.screenshot(path=str(root.parent/('mobile-test.png' if w==390 else 'preview-test.png')),full_page=True)
  page.close();print(f'{w}px: 7 pages, add and detail dialogs passed')
 b.close()
