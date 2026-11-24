from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public'
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','').replace('<script defer src="app.js"></script>','').replace('<link rel="icon" href="icon.svg">','')
css=(root/'style.css').read_text().split('\n',1)[1]
js=(root/'app.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def setup(page):
  page.set_content(html);page.add_style_tag(content=css)
  page.evaluate('''() => {const mem={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=v}});window.fetch=async url=>({ok:true,json:async()=>String(url).includes('er-api')?{result:'success',rates:{USD:1,RUB:90,EUR:.9,HKD:7.8},time_last_update_unix:1795500000}:{title:'Silk dress',description:'Test description',category:'Одежда',price:100,currency:'USD',image:''}})}''')
  page.add_script_tag(content=js);page.wait_for_timeout(150)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 setup(page)
 page.get_by_role('button',name='Посмотреть пример').click();page.wait_for_timeout(100);page.evaluate("window.scrollTo(0,0);document.getElementById('toast').classList.remove('show')");page.screenshot(path=str(root.parent/'preview-test.png'),full_page=True)
 assert page.locator('.product-card').count()==6
 page.locator('#top-add').click();page.locator('[name=title]').fill('Тест');page.locator('[name=price]').fill('100');page.locator('[name=currency]').select_option('USD');page.locator('[name=quantity]').fill('2');page.locator('[name=shipping]').fill('10');page.locator('[data-rating="5"]').click();page.locator('[name=favorite]').check();page.get_by_role('button',name='Сохранить желание').click();assert page.locator('.product-card').count()==7
 page.locator('#quick-form input').fill('https://shop.example.com/product');page.locator('#quick-form button').click();page.wait_for_function("document.querySelector('#item-form [name=title]').value === 'Silk dress'");assert page.locator('#item-form [name=price]').input_value()=='100';page.get_by_role('button',name='Сохранить желание').click();assert page.locator('.product-card').count()==8
 page.locator('#search').fill('Silk dress');assert page.locator('.product-card').count()==1;page.locator('.product-card [data-action=toggle-bought]').click();page.locator('#nav [data-page=bought]').click();page.wait_for_timeout(100);assert page.locator('.product-card').count()==1
 page.locator('#nav [data-page=collections]').click();page.wait_for_timeout(100);page.locator('[data-action=new-list]').click();page.locator('#list-form [name=name]').fill('Новая');page.locator('button[form=list-form]').click();assert page.get_by_text('Новая',exact=True).count()>=1
 page.locator('#nav [data-page=home]').click();page.wait_for_timeout(100);page.locator('#top-share').click();url=page.locator('#share-url').input_value();assert '#share=' in url
 page.evaluate("() => {const snapshot=normalize(decode(document.querySelector('#share-url').value.split('#share=')[1]));if(snapshot.items.length!==7)throw Error('bad snapshot');}")
 mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);setup(mobile);mobile.get_by_role('button',name='Посмотреть пример').click();mobile.evaluate("window.scrollTo(0,0);document.getElementById('toast').classList.remove('show')");mobile.screenshot(path=str(root.parent/'mobile-test.png'),full_page=True);assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth');print('browser smoke tests passed; page errors:',errors);assert not errors
 b.close()
