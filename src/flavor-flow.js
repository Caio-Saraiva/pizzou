import {voterIdentity} from './voter-identity.js';
import {icon, pizza} from './graphics.js';
import {allocateDietaryFlavors, seededShuffle, fraction, escapeHtml as esc} from './voting.js';
const colors=['#d95035','#e5b84d','#73935b','#a875b5','#dc8455','#6698a5','#ba6d87','#a69542','#5c9c8a','#c98d30','#748bb5','#ce735d'];
const splitGraphic = parts => `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="#f4c569" stroke="#d18e42" stroke-width="3"/>${parts>=2&&parts!==3?'<path d="M24 5v38"/>':''}${parts===3?'<path d="M24 24V5M24 24l16.45 9.5M24 24L7.55 33.5"/>':''}${parts===4?'<path d="M5 24h38"/>':''}</svg>`;
export class FlavorFlow {
  constructor({getOrder,t,onComplete,onReceipt,notify}) { Object.assign(this,{getOrder,t,onComplete,onReceipt,notify}); this.session=null; this.el=null; this.drag=null; }
  markup() { return '<dialog id="flavor-dialog" class="flavor-dialog" aria-labelledby="fl-title"></dialog>'; }
  attach(el) {
    this.el=el;
    el.addEventListener('click',e=>this.click(e));
    el.addEventListener('submit',e=>{e.preventDefault();this.add(el.querySelector('.fl-input')?.value);});
    el.addEventListener('input',e=>{if(e.target.matches('.fl-input')) el.querySelector('.fl-add').disabled=!e.target.value.trim();});
    el.addEventListener('pointerdown',e=>this.pointerDown(e));
    el.addEventListener('pointermove',e=>this.pointerMove(e));
    el.addEventListener('pointerup',e=>this.pointerEnd(e));
    el.addEventListener('pointercancel',()=>this.cancelDrag());
    el.addEventListener('keydown',e=>{
      const radio=e.target.closest('.fl-split');
      if(!radio||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
      e.preventDefault();e.stopPropagation();
      const buttons=[...el.querySelectorAll('.fl-split')],i=buttons.indexOf(radio),n=(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:buttons.length-1))%buttons.length;
      buttons[n].click();buttons[n].focus();
    });
  }
  reset() { this.session=null; this.cancelDrag(); }
  open() {
    const order=this.getOrder(); if(!order.result) return;
    const signature=JSON.stringify([order.people,order.size,order.portions,order.result.count]);
    if(!this.session||this.session.signature!==signature) {
      this.session={signature,order:{...order,people:[...order.people],portions:[...order.portions]},stage:'setup',dietary:order.people.map(()=>false),flavors:[],parts:2,ballots:[],ranking:[],seed:crypto.getRandomValues(new Uint32Array(1))[0],nextId:0,plan:null};
    }
    this.render(); if(!this.el.open)this.el.showModal();
  }
  message(value){const notice=this.el.querySelector('.fl-notice');notice.textContent=value;notice.classList.add('is-visible');clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>notice.classList.remove('is-visible'),3500);}
  get f(){return this.t().flavor;}
  name(id){return this.session.flavors.find(x=>x.id===id)?.name||id;}
  color(id){return colors[this.session.flavors.findIndex(x=>x.id===id)%colors.length];}
  add(value){
    const name=String(value||'').normalize('NFKC').trim().replace(/\s+/g,' '),s=this.session;
    if(!name)return;
    if(name.length>40||s.flavors.length>=12){this.message(this.f.limit);return;}
    if(s.flavors.some(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase())){this.message(this.f.duplicate);return;}
    s.flavors.push({id:`f${s.nextId++}`,name,veggie:false});this.render();this.el.querySelector('.fl-input').focus();
  }
  veggieBadge(id){return this.session.flavors.find(x=>x.id===id)?.veggie ? `<span class="veggie-badge" title="${this.f.veggie}" aria-label="${this.f.veggie}">${icon('leaf')}</span>` : '';}
  dietaryControl(){const s=this.session,active=!!s.dietary[s.ballots.length];return `<button class="dietary-toggle ${active?'is-veggie':''}" data-fl="dietary" aria-pressed="${active}">${icon('leaf')}<span>${this.f.veggiePerson}</span><span class="dietary-check">${icon(active?'check':'plus')}</span></button>${active&&!s.flavors.some(x=>x.veggie)?`<div class="fl-dietary-warning" role="status">${this.f.veggieMissing}<button class="fl-restart" data-fl="edit-flavors">${icon('up')}${this.f.editFlavors}</button></div>`:''}`;}
  rankingMarkup(){
    return this.session.ranking.map((id,i)=>`<li class="fl-rank-card" data-id="${id}"><span class="fl-rank-number">${i+1}</span><strong>${esc(this.name(id))} ${this.veggieBadge(id)}</strong><div class="fl-rank-moves"><button class="fl-icon" data-fl="up" data-id="${id}" aria-label="${esc(`${this.f.up}: ${this.name(id)}`)}" ${i===0?'disabled':''}>${icon('up')}</button><button class="fl-icon" data-fl="down" data-id="${id}" aria-label="${esc(`${this.f.down}: ${this.name(id)}`)}" ${i===this.session.ranking.length-1?'disabled':''}>${icon('down')}</button></div><button class="fl-grip fl-icon" data-fl="drag" data-id="${id}" aria-label="${esc(`${this.f.drag}: ${this.name(id)}`)}">${icon('grip')}</button></li>`).join('');
  }
  setup(){const f=this.f,s=this.session;return `<div class="fl-body fl-setup"><p class="fl-hint">${f.setupHint}</p><form class="fl-add-form"><input class="fl-input" aria-label="${f.input}" placeholder="${f.placeholder}" maxlength="40" autocomplete="off"/><button type="submit" class="fl-add fl-icon" aria-label="${f.add}" disabled>${icon('plus')}</button></form><div class="fl-tags">${s.flavors.map(x=>`<span class="fl-tag ${x.veggie?'is-veggie':''}"><button class="fl-tag-toggle" data-fl="veggie" data-id="${x.id}" aria-pressed="${!!x.veggie}" aria-label="${esc(`${x.name}: ${f.veggie}`)}"><span>${esc(x.name)}</span>${this.veggieBadge(x.id)}</button><button class="fl-icon" data-fl="remove" data-id="${x.id}" aria-label="${esc(`${f.remove}: ${x.name}`)}">${icon('close')}</button></span>`).join('')}</div><p class="fl-veggie-hint">${icon('leaf')}${f.veggieHint} · ${f.veggie}</p>${!s.flavors.length?`<div class="fl-empty">${pizza(8)}<p>${f.minimum}</p></div>`:''}<details class="fl-presets"><summary>${f.suggestions}</summary><div>${f.presets.map(name=>`<button data-fl="preset" data-name="${esc(name)}" ${s.flavors.some(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase())?'disabled':''}>${esc(name)}</button>`).join('')}</div></details><fieldset class="fl-division"><legend>${f.splitTitle}</legend><div role="radiogroup" aria-label="${f.splitTitle}">${[1,2,3,4].map((parts,i)=>`<button class="fl-split ${s.parts===parts?'selected':''}" role="radio" aria-label="${f.splits[i]}" aria-checked="${s.parts===parts}" tabindex="${s.parts===parts?0:-1}" data-fl="split" data-parts="${parts}">${splitGraphic(parts)}<strong>${f.splits[i]}</strong></button>`).join('')}</div></fieldset><p class="fl-limit">${s.flavors.length}/12 · ${f.limit}</p></div><div class="fl-footer"><button class="share-button" data-fl="begin" ${s.flavors.length<2?'disabled':''}>${icon('people')}${f.begin}</button></div>`;}
  vote(){const f=this.f,s=this.session,l=this.t();return `<div class="fl-body fl-vote-body">${voterIdentity(s.order,s.ballots.length,l)}${this.dietaryControl()}<p class="fl-hint" id="fl-rank-hint">${f.rankHint}</p><ol class="fl-ranking" aria-describedby="fl-rank-hint">${this.rankingMarkup()}</ol></div><div class="fl-footer"><button class="share-button" data-fl="confirm" ${s.dietary[s.ballots.length]&&!s.flavors.some(x=>x.veggie)?'disabled':''}>${icon('check')}${f.confirm}</button></div>`;}
  handoff(){const f=this.f,s=this.session,l=this.t();return `<div class="fl-body fl-handoff"><p class="voter-eyebrow">${s.ballots.length ? f.handoff : f.yourTurn}</p>${voterIdentity(s.order,s.ballots.length,l,true)}${this.dietaryControl()}<span class="fl-hint">${s.ballots.length}/${s.order.people.length} ${f.voted}</span><p class="fl-privacy">${f.privacy}</p></div><div class="fl-footer"><button class="share-button" data-fl="ready">${icon('check')}${f.start}</button></div>`;}
  pizzaGraphic(portions){let offset=0;const stops=portions.map(p=>{const start=offset;offset+=p.units/this.session.parts*100;return `${this.color(p.id)} ${start}% ${offset}%`;});return `<span class="fl-pizza-disc" style="background:conic-gradient(${stops.join(',')})" aria-hidden="true"></span>`;}
  result(){const f=this.f,s=this.session,l=this.t(),plan=s.plan;return `<div class="fl-body fl-results"><div class="fl-final-heading"><span class="fl-final-check">${icon('check')}</span><h2>${f.finished}</h2><p>${f.finishHint}</p><strong>${plan.pizzaCount} ${plan.pizzaCount===1?l.pizza:l.pizzas} · ${l.sizeNames[s.order.size]}</strong><span>${s.ballots.length}/${s.order.people.length} ${f.voted}</span></div><div class="fl-pizza-groups">${plan.pizzas.map(group=>`<article class="fl-pizza-group ${group.portions.every(p=>s.flavors.find(x=>x.id===p.id)?.veggie)?'is-veggie':''}">${this.pizzaGraphic(group.portions)}<div><h3>${group.count} × ${l.sizeNames[s.order.size]}</h3><ul>${group.portions.map(p=>`<li><i style="background:${this.color(p.id)}"></i><span>${fraction(p.units,s.parts)} ${esc(this.name(p.id))} ${this.veggieBadge(p.id)}</span></li>`).join('')}</ul></div></article>`).join('')}</div>${s.flavors.some(x=>x.veggie)?`<p class="fl-veggie-note">${icon('leaf')}${f.veggieNote}</p>`:''}<details class="fl-method"><summary>${f.method}</summary><p>${f.methodText}</p>${plan.veggiePizzaCount?`<p>${f.dietaryMethod}</p>`:''}<p>${f.tieText}</p><a href="https://www.aec.gov.au/learn/preferential-voting.htm" target="_blank" rel="noopener noreferrer">Australian Electoral Commission</a><ol>${plan.rounds.map(round=>`<li><span>${round.type==='eliminate'?f.eliminated:f.elected}${round.type==='elect'?` (${round.units})`:''}</span><strong>${esc(this.name(round.id))}</strong></li>`).join('')}</ol><p>${f.tieOrder}: ${plan.tieOrder.map(id=>esc(this.name(id))).join(' · ')}</p></details><button class="fl-restart" data-fl="restart">${icon('reset')}${f.restart}</button></div><div class="fl-footer fl-final-actions"><button class="secondary-button" data-fl="close">${f.return}</button><button class="share-button" data-fl="receipt">${icon('share')}${f.export}</button></div>`;}
  render(){if(!this.session)return;this.cancelDrag();const s=this.session;this.el.innerHTML=`<div class="fl-shell"><header class="fl-header"><h2 id="fl-title">${this.f.title}</h2><button class="fl-icon" data-fl="close" aria-label="${this.t().close}">${icon('close')}</button></header>${s.stage==='setup'?this.setup():s.stage==='vote'?this.vote():s.stage==='handoff'?this.handoff():this.result()}<div class="fl-notice" role="status"></div></div>`;this.el.querySelector('.fl-body')?.scrollTo(0,0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.el.querySelector('.voter-identity')?.animate([{opacity:0,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:380,easing:'cubic-bezier(.2,.8,.3,1)'});const heading=this.el.querySelector('.voter-identity h2,.fl-final-heading h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  move(id,index){const s=this.session,old=s.ranking.indexOf(id);s.ranking.splice(old,1);s.ranking.splice(Math.max(0,Math.min(index,s.ranking.length)),0,id);const list=this.el.querySelector('.fl-ranking'),scroll=list.scrollTop;list.innerHTML=this.rankingMarkup();list.scrollTop=scroll;list.querySelector(`[data-fl="drag"][data-id="${id}"]`)?.focus({preventScroll:true});}
  click(event){const b=event.target.closest('[data-fl]');if(!b)return;const {fl,id,parts,name}=b.dataset,s=this.session;
    if(fl==='close'){this.el.close();return;}
    if(fl==='veggie'&&s.stage==='setup'){
      const flavor=s.flavors.find(x=>x.id===id);flavor.veggie=!flavor.veggie;this.render();
      this.el.querySelector(`[data-fl="veggie"][data-id="${id}"]`)?.focus();
    }
    if(fl==='dietary'&&['vote','handoff'].includes(s.stage)){s.dietary[s.ballots.length]=!s.dietary[s.ballots.length];this.render();this.el.querySelector('[data-fl="dietary"]')?.focus();}
    if(fl==='edit-flavors'&&['vote','handoff'].includes(s.stage)){s.stage='setup';s.ballots=[];s.ranking=[];this.render();}
    if(fl==='remove'&&s.stage==='setup'){s.flavors=s.flavors.filter(x=>x.id!==id);this.render();}
    if(fl==='preset'&&s.stage==='setup')this.add(name);
    if(fl==='split'&&s.stage==='setup'){s.parts=Number(parts);this.render();this.el.querySelector(`[data-parts="${parts}"]`)?.focus();}
    if(fl==='begin'&&s.stage==='setup'&&s.flavors.length>=2){s.stage='handoff';this.render();}
    if(fl==='ready'&&s.stage==='handoff'){s.stage='vote';s.ranking=seededShuffle(s.flavors.map(x=>x.id),s.seed+s.ballots.length);this.render();}
    if(['up','down'].includes(fl)&&s.stage==='vote')this.move(id,s.ranking.indexOf(id)+(fl==='up'?-1:1));
    if(fl==='confirm'&&s.stage==='vote'){
      if(s.dietary[s.ballots.length]&&!s.flavors.some(x=>x.veggie)){this.message(this.f.veggieMissing);return;}
      s.ballots.push([...s.ranking]);s.ranking=[];
      if(s.ballots.length===s.order.people.length){s.plan={...allocateDietaryFlavors(s.ballots,s.flavors,s.order.result.count,s.parts,s.seed,s.order.people.map(level=>s.order.portions[level]),s.dietary,s.order.result.items[0].slices),flavors:s.flavors.map(x=>({...x}))};s.stage='result';this.onComplete(s.plan);}
      else s.stage='handoff';
      this.render();
    }
    if(fl==='restart'&&s.stage==='result'){s.stage='setup';s.ballots=[];s.ranking=[];s.plan=null;this.onComplete(null);this.render();}
    if(fl==='receipt'&&s.stage==='result'){this.el.close();this.onReceipt();}
  }
  pointerDown(e){const handle=e.target.closest('.fl-grip');if(!handle||e.button!==0)return;const row=handle.closest('.fl-rank-card');this.drag={id:handle.dataset.id,pointerId:e.pointerId,start:e.clientY,row,target:this.session.ranking.indexOf(handle.dataset.id)};handle.setPointerCapture(e.pointerId);row.classList.add('is-dragging');}
  pointerMove(e){if(!this.drag||e.pointerId!==this.drag.pointerId)return;e.preventDefault();const d=this.drag,list=this.el.querySelector('.fl-ranking');d.row.style.transform=`translateY(${e.clientY-d.start}px)`;const others=[...list.children].filter(row=>row.dataset.id!==d.id);d.target=others.filter(row=>{const r=row.getBoundingClientRect();return e.clientY>r.top+r.height/2;}).length;list.querySelectorAll('.fl-drop-target').forEach(x=>x.classList.remove('fl-drop-target'));(others[d.target]||others.at(-1))?.classList.add('fl-drop-target');const box=list.getBoundingClientRect();if(e.clientY<box.top+35)list.scrollBy(0,-10);if(e.clientY>box.bottom-35)list.scrollBy(0,10);}
  pointerEnd(e){if(!this.drag||e.pointerId!==this.drag.pointerId)return;const {id,target}=this.drag;this.cancelDrag();this.move(id,target);}
  cancelDrag(){if(this.drag){this.drag.row.style.transform='';this.drag.row.classList.remove('is-dragging');this.drag=null;}this.el?.querySelectorAll('.fl-drop-target').forEach(x=>x.classList.remove('fl-drop-target'));}
}
