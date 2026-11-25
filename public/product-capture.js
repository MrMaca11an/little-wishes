'use strict';
(function(root){
function collect(doc,href){
  const trim=(v,n=5000)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,n):'';
  const meta=(...keys)=>{for(const el of doc.querySelectorAll('meta'))if(keys.includes((el.getAttribute('property')||el.getAttribute('name')||el.getAttribute('itemprop')||'').toLowerCase())&&el.content)return el.content;return ''};
  const url=new URL(href);const host=url.hostname.replace(/^www\./,'');
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Открой публичную страницу товара.');
  // Strip known tracking parameters, never read browser storage, cookies, form values or account data.
  url.hash='';for(const k of [...url.searchParams.keys()])if(/^utm_|^(?:gclid|fbclid|yclid|at|cmp|ef_id|s_kwcid)$/i.test(k))url.searchParams.delete(k);
  if([...url.searchParams.keys()].some(k=>/token|session|password|signature|auth|api.?key/i.test(k)))throw Error('Ссылка содержит приватные параметры.');
  const list=[];function visit(v,d=0){if(!v||typeof v!=='object'||d>20||list.length>30)return;if(Array.isArray(v)){for(const x of v)visit(x,d+1);return}if([v['@type']].flat().some(t=>/^(?:Product|ProductGroup|IndividualProduct)$/.test(String(t).split('/').pop())))list.push(v);for(const x of Object.values(v))visit(x,d+1)}
  for(const s of doc.querySelectorAll('script[type="application/ld+json"]'))try{visit(JSON.parse(s.textContent))}catch{}
  const h1=trim(doc.querySelector('h1')?.innerText||doc.querySelector('h1')?.textContent,250);
  const og=trim(meta('og:title','twitter:title'),250);
  const exact=v=>{try{const u=new URL(v,url);return u.hostname===url.hostname&&u.pathname.replace(/\/$/,'')===url.pathname.replace(/\/$/,'')&&[...url.searchParams].every(([k,val])=>u.searchParams.get(k)===val)}catch{return false}};
  const matched=list.filter(v=>[v.url,v['@id']].some(s=>typeof s==='string'&&exact(s)));
  const names=list.filter(v=>typeof v.name==='string'&&[h1,og].some(t=>t.toLowerCase().includes(v.name.toLowerCase())));
  const p=matched.length===1?matched[0]:names.length===1?names[0]:list.length===1?list[0]:{};
  const title=trim(p.name||h1||og||doc.title,250);
  if(!title||/^(?:https?:\/\/|www\.|access denied|captcha|just a moment|forbidden|page not found|похоже[, ]+нет соединения|страница не найдена|the world.s most comfortable shoes|loading|загрузка|sign in|log in)/i.test(title))throw Error('На открытой странице нет карточки товара.');
  const offers=[p.offers].flat().filter(v=>v&&typeof v==='object');
  const matches=offers.filter(v=>typeof v.url==='string'&&exact(v.url));
  const o=offers.length===1?offers[0]:matches.length===1?matches[0]:{};
  const spec=[o.priceSpecification].flat().filter(v=>v&&typeof v==='object');const sp=spec.length===1?spec[0]:{};
  const explicit=trim(o.priceCurrency||sp.priceCurrency||meta('product:price:currency','og:price:currency','pricecurrency'),10).toUpperCase();
  let market='';
  // Known official storefronts encode market in their URL; no inference for arbitrary stores.
  if((host==='lego.com'&&/^\/en-us\/product\//.test(url.pathname))||(host==='uniqlo.com'&&/^\/us\/en\/products\//.test(url.pathname))||(host==='adidas.com'&&/^\/us\//.test(url.pathname))||(host==='chanel.com'&&/^\/us\//.test(url.pathname)))market='USD';
  if(host==='bulgari.com'&&/^\/en-hk\//.test(url.pathname))market='HKD';
  if(host==='ozon.ru'&&/^\/product\//.test(url.pathname))market='RUB';
  if(host==='sephora.com'&&/^\/product\//.test(url.pathname))market=''; // Canada/US may vary by session.
  function priceValue(v,c){
    let s=trim(String(v??''),80).replace(/\s/g,'');let code=/^[A-Z]{3}$/.test(c)?c:'';
    const symbols=[['HKD','HK$'],['USD','US$'],['EUR','€'],['GBP','£'],['RUB','₽'],['CNY','CN¥'],['JPY','JP¥'],['CAD','CA$'],['AUD','AU$']];
    for(const [iso,sym] of symbols)if(s.includes(sym)){if(code&&code!==iso)return null;code=iso;s=s.replace(sym,'')}
    const iso=s.match(/^[A-Z]{3}|[A-Z]{3}$/);if(iso){if(code&&code!==iso[0])return null;code=iso[0];s=s.replace(iso[0],'')}
    if(code&&s.startsWith('$'))s=s.slice(1);
    if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');else if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');
    if(!code||!/^\d+(?:\.\d+)?$/.test(s))return null;const amount=Number(s);return Number.isFinite(amount)&&amount<=1e12?{price:amount,currency:code}:null;
  }
  let money=priceValue(o.price??sp.price??(offers.length<=1?meta('product:price:amount','og:price:amount','price'):''),explicit);
  // Only narrowly scoped current-price elements; multiple distinct prices => leave blank.
  if(!money){const prices=[];for(const el of doc.querySelectorAll('[itemprop="price"],[data-testid="product-price"],[data-test="product-price"],[data-test="product-price-value"],.product-price,.current-price,.price-current,.sale-price')){if(!el.getClientRects().length&&el.tagName!=='META')continue;if(el.closest('del,s,[aria-hidden="true"]'))continue;const v=priceValue(el.getAttribute('content')||el.innerText||el.textContent,explicit||market);if(v)prices.push(v)}
    const unique=[...new Map(prices.map(v=>[v.currency+':'+v.price,v])).values()];if(unique.length===1)money=unique[0]}
  // LEGO primary/sticky buy panel; exact product name next to price.
  if(!money&&host==='lego.com'&&market){const lines=(doc.body?.innerText||'').split(/\n/);const vals=[];for(let i=0;i<lines.length;i++){const t=trim(lines[i],100);if(t.length>2&&title.toLowerCase().startsWith(t.toLowerCase())){const v=priceValue(lines.slice(i+1,i+5).find(x=>x.trim()),market);if(v)vals.push(v)}}const uniq=[...new Map(vals.map(v=>[v.currency+':'+v.price,v])).values()];if(uniq.length===1)money=uniq[0]}
  const images=[];const add=v=>{try{if(typeof v!=='string'||!v)return;const u=new URL(v,url);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&!/favicon|sprite|placeholder|\/logo[._/-]|tracking/i.test(u.pathname)&&!images.includes(u.href)&&images.length<5)images.push(u.href)}catch{}};
  for(const im of [p.image].flat())add(typeof im==='string'?im:im?.url||im?.contentUrl);add(meta('og:image','twitter:image'));
  if(!images.length){const main=doc.querySelector('main,[role="main"]');if(main)for(const im of main.querySelectorAll('img')){if(im.naturalWidth>=200&&im.naturalHeight>=200&&trim(im.alt,120)&&title.toLowerCase().includes(trim(im.alt,120).toLowerCase()))add(im.currentSrc||im.src)}}
  const description=trim(p.description?String(p.description).replace(/<[^>]*>/g,' '):meta('og:description','description'),1000);
  const variant=trim([p.color,p.size].filter(x=>typeof x==='string').join(' / '),200);
  if(!p.name&&!h1&&!images.length)throw Error('Не удалось определить товар.');
  return {kind:'kuklas-product-v1',url:url.href,title,description,images,price:money?.price??null,currency:money?.currency||'',variant};
}
function bookmark(){return 'javascript:('+function(collect){
  try{const data=JSON.stringify(collect(document,location.href));const fallback=()=>prompt('Скопируй данные и вставь их в kukla’s wishes:',data);if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(data).then(()=>alert('Карточка скопирована. Вернись в kukla’s wishes и вставь данные.'),fallback);else fallback()}catch(e){alert(e.message||'Не удалось прочитать товар.')}
}.toString()+')('+collect.toString()+')';}
const api={collect,bookmark};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KuklasCapture=api;
})(typeof globalThis!=='undefined'?globalThis:this);
