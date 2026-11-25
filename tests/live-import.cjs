'use strict';
const {handler}=require('../netlify/functions/import-product.cjs');
const cases=[
 ['Bulgari','https://www.bulgari.com/en-hk/jewellery/rings/serpenti-viper-wedding-band-yellow-gold-362433','serpenti','HKD'],
 ['Chanel','https://www.chanel.com/us/fragrance/p/116420/coco-mademoiselle-eau-de-parfum-spray/','mademoiselle','USD'],
 ['IKEA US','https://www.ikea.com/us/en/p/stockholm-2025-vase-black-20590498/','stockholm','USD'],
 ['IKEA FI','https://www.ikea.com/fi/en/p/stockholm-2025-vase-black-20590498/','stockholm','EUR'],
 ['Adidas','https://www.adidas.com/us/samba-og-w/IE5836.html','samba','USD'],
 ['Uniqlo','https://www.uniqlo.com/us/en/products/E475647-000/00?colorDisplayCode=53&sizeDisplayCode=003','linen','USD'],
 ['Sephora','https://www.sephora.com/product/rare-beauty-by-selena-gomez-soft-pinch-liquid-blush-P97989778?skuId=3000262','soft pinch','USD'],
 ['Apple','https://www.apple.com/shop/buy-airpods/airpods-pro-3','airpods','USD'],
 ['LEGO','https://www.lego.com/en-us/product/orchid-10311','orchid','USD'],
 ['Allbirds','https://www.allbirds.com/products/womens-tree-runner-go-hazy-pine','tree runner','USD'],
 ['Ozon','https://www.ozon.ru/product/polaris-uvlazhnitel-vozduha-puh-8080-wi-fi-iq-home-chernyy-1044711493/','polaris','RUB']
];
async function check([brand,url,expected,currency],i){
 const start=Date.now();
 try{
  const res=await handler({httpMethod:'POST',headers:{'x-nf-client-connection-ip':'smoke-'+i},body:JSON.stringify({url,refresh:true})});
  const p=JSON.parse(res.body);
  const titleOK=String(p.title||'').toLowerCase().includes(expected);
  const priceOK=typeof p.price==='number'&&p.price>=0&&p.currency===currency;
  const imageOK=typeof p.image==='string'&&/^https?:\/\//.test(p.image);
  const descOK=typeof p.description==='string'&&p.description.length>=20;
  const classification=res.statusCode===200&&titleOK?(priceOK&&imageOK&&descOK?'complete':'partial'):res.statusCode===200?'wrong_title':'failed';
  return {brand,url,status:res.statusCode,classification,title:p.title||'',titleOK,price:p.price??null,currency:p.currency||'',expectedCurrency:currency,image: p.image||'',imageOK,descriptionLength:p.description?.length||0,category:p.category||'',source:p.source||'',attempts:p.attempts||[],error:p.error||'',ms:Date.now()-start};
 }catch(err){return {brand,url,classification:'failed',error:String(err),ms:Date.now()-start}}
}
(async()=>{const all=[];for(let i=0;i<cases.length;i+=3){const batch=await Promise.all(cases.slice(i,i+3).map((v,j)=>check(v,i+j)));for(const r of batch){all.push(r);console.log('LIVE_RESULT '+JSON.stringify(r))}}
 const summary=all.reduce((a,r)=>(a[r.classification]=(a[r.classification]||0)+1,a),{});console.log('LIVE_SUMMARY '+JSON.stringify(summary));require('node:fs').writeFileSync('live-import-results.json',JSON.stringify({at:new Date().toISOString(),summary,results:all},null,2));})().catch(e=>{console.error(e);process.exitCode=1});
