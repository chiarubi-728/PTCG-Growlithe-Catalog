'use strict';
const catalog=JSON.parse(document.querySelector('#catalog-data').textContent);
const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const languageNames={ja:'日文','zh-tw':'繁中',en:'英文'};
const sourceNames={official_ja:'日本官方',official_tw:'繁中官方',tcgcollector:'TCG Collector'};
const els=Object.fromEntries(['sort','language','species','year-status','query','results','count','empty','sort-note','detail','detail-image','bottom-crop'].map(id=>[id,document.getElementById(id)]));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=new Map(catalog.cards.map(row=>[row.id,row]));
const groupById=new Map(catalog.groups.map(group=>[group.id,group]));
const numberPart=row=>row.number.replace(/^No\.?\s*/i,'').split('/')[0];
const byNumber=(a,b)=>collator.compare(numberPart(a),numberPart(b))||collator.compare(a.number,b.number);
const bySet=(a,b)=>collator.compare(a.setCode||a.setName,b.setCode||b.setName)||byNumber(a,b)||collator.compare(a.language,b.language)||collator.compare(a.id,b.id);
const yearValue=row=>row.printedYear.status==='confirmed'?row.printedYear.confirmedYear:row.printedYear.status==='ocr-candidate'?row.printedYear.candidate:null;
function compareRows(a,b,mode){
  if(mode==='number')return byNumber(a,b)||bySet(a,b);
  if(mode==='name')return collator.compare(a.species,b.species)||collator.compare(a.name,b.name)||bySet(a,b);
  if(mode.startsWith('printed-')){const x=yearValue(a),y=yearValue(b);if(x==null&&y!=null)return 1;if(y==null&&x!=null)return -1;if(x!=null&&y!=null&&x!==y)return mode==='printed-desc'?y-x:x-y;return bySet(a,b);}
  return bySet(a,b);
}
function yearText(row){const y=row.printedYear;if(y.status==='confirmed')return `底部年份：${y.confirmedYear??y.confirmedYears.join('／')}（已目視確認${y.confirmedYear==null?'，多年份':''}）`;if(y.status==='ocr-candidate')return `底部年份：${y.years.join('／')}（OCR 待確認${y.years.length>1?'，多年份':''}）`;return '底部年份：尚未讀出';}
function cardHtml(row){
  const y=row.printedYear;
  return `<article data-id="${esc(row.id)}"><button class="art" data-inspect="${esc(row.id)}" aria-label="看圖 ${esc(row.name)} ${esc(row.number)}"><img loading="lazy" src="${esc(row.localImage)}" alt="${esc(row.name)} ${esc(row.setCode)} ${esc(row.number)}"><span class="failed" hidden>本機圖未能載入，請確認 images 資料夾</span></button><span class="badge ${esc(row.language)}">${languageNames[row.language]}</span><h3>${esc(row.name)}</h3><p class="set">${esc(row.setCode)}${row.setName!==row.setCode?' · '+esc(row.setName):''}</p><p class="number">${esc(row.number)}</p><p class="small">繪師：${esc(row.artist)}</p><p class="year ${y.status==='confirmed'?'confirmed':y.status==='ocr-candidate'?'candidate':''}">${esc(yearText(row))}</p><p class="small">系列發售年：${row.releaseYear||'尚無來源欄位'}</p><p class="small">${esc(sourceNames[row.source])} · ${esc(row.id.split(':')[1])}</p><button class="inspect" data-inspect="${esc(row.id)}">看圖／底部放大</button><a class="source" href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">來源 ↗</a></article>`;
}
function render(){
  const q=els.query.value.trim().toLowerCase(),mode=els.sort.value;
  const cards=catalog.cards.filter(row=>(els.language.value==='all'||row.language===els.language.value)&&(els.species.value==='all'||row.species===els.species.value)&&(els['year-status'].value==='all'||row.printedYear.status===els['year-status'].value)&&[row.name,row.species,row.species==='growlithe'?'卡蒂狗':'風速狗',/Hisuian|ヒスイ|洗翠/.test(row.name)?'洗翠':'',row.setName,row.setCode,row.number,row.artist,row.id].join(' ').toLowerCase().includes(q));
  const groups=new Map();for(const row of cards){if(!groups.has(row.artworkGroupId))groups.set(row.artworkGroupId,[]);groups.get(row.artworkGroupId).push(row);}
  if(mode==='artwork'){
    const sorted=[...groups].sort(([,a],[,b])=>(a[0].species==='growlithe'?0:1)-(b[0].species==='growlithe'?0:1)||bySet([...a].sort(bySet)[0],[...b].sort(bySet)[0]));
    els.results.className='';els.results.innerHTML=sorted.map(([id,rows])=>{const group=groupById.get(id);return `<section class="group" data-group="${esc(id)}"><header class="group-head"><div><h2>${esc(group.label)}</h2><p>${group.members.length>1?'同插畫 · 語言／再版／加工差異分開保留':'本批尚無其他同圖配對'}</p></div><span>${rows.length} / ${group.members.length} 筆</span></header><div class="grid">${rows.sort(bySet).map(cardHtml).join('')}</div></section>`;}).join('');
  }else{els.results.className='grid flat';els.results.innerHTML=cards.sort((a,b)=>compareRows(a,b,mode)).map(cardHtml).join('');}
  els.count.textContent=`${cards.length} / ${catalog.cards.length} 筆 · ${groups.size} 組插畫`;
  els.empty.hidden=cards.length!==0;
  els['sort-note'].textContent=mode.startsWith('printed-')?'含未確認 OCR 候選；未知／多年份未定者置後，不用發售年補值。':mode==='number'?'按卡號分子自然排序；不同系列仍保留，不視為同一張卡。':mode==='artwork'?'跨語言同圖並排，不合併卡片紀錄。':'同排序值以系列、卡號、語言及來源 ID 穩定排列。';
}
let composing=false;els.query.addEventListener('compositionstart',()=>{composing=true;});els.query.addEventListener('compositionend',()=>{composing=false;render();});els.query.addEventListener('input',()=>{if(!composing)render();});
for(const name of ['sort','language','species','year-status'])els[name].addEventListener('change',render);
document.getElementById('reset').addEventListener('click',()=>{els.sort.value='artwork';for(const name of ['language','species','year-status'])els[name].value='all';els.query.value='';render();});
let inspectionId=null;
function drawBottom(){const img=els['detail-image'];if(!img.naturalWidth)return;const canvas=els['bottom-crop'],ctx=canvas.getContext('2d');const y=Math.floor(img.naturalHeight*.82),h=img.naturalHeight-y;canvas.width=img.naturalWidth*3;canvas.height=h*3;ctx.drawImage(img,0,y,img.naturalWidth,h,0,0,canvas.width,canvas.height);}
els['detail-image'].addEventListener('load',drawBottom);
els.results.addEventListener('click',event=>{const button=event.target.closest('[data-inspect]');if(!button)return;const row=byId.get(button.dataset.inspect);inspectionId=row.id;document.getElementById('detail-title').textContent=row.name;document.getElementById('detail-meta').textContent=`${languageNames[row.language]} · ${row.setCode} · ${row.number} · ${row.id}`;document.getElementById('detail-year').textContent=yearText(row);document.getElementById('detail-release').textContent=`系列發售年：${row.releaseYear||'未知'}（來源的系列日期，不代替底部年份）`;document.getElementById('ocr-text').textContent=row.printedYear.rawText||'未辨識出文字';document.getElementById('source-link').href=row.sourceUrl;document.getElementById('original-image').href=row.localImage;els['bottom-crop'].getContext('2d').clearRect(0,0,els['bottom-crop'].width,els['bottom-crop'].height);els['detail-image'].src=row.localImage;els['detail-image'].alt=row.name+' '+row.number;els.detail.showModal();if(els['detail-image'].complete)drawBottom();});
document.getElementById('close-detail').addEventListener('click',()=>els.detail.close());
els.detail.addEventListener('close',()=>{const button=[...els.results.querySelectorAll('[data-inspect]')].find(el=>el.dataset.inspect===inspectionId);button?.focus();});
document.addEventListener('error',event=>{const img=event.target;if(img.tagName==='IMG'&&img.closest('article')){img.hidden=true;img.nextElementSibling.hidden=false;}},true);
render();
