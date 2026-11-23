import './style.css';
import './board.css';
import './flavors.css';
import { SIZES, PORTIONS, calculate, adjustPortions } from './calculator.js';
import { baselineEditor } from './appetite-editor.js';
import { languages, messages } from './i18n.js';
import { restorePreferences } from './preferences.js';
import { icon, face, pizza } from './graphics.js';
import { createReceipt } from './receipt.js';
import { FlavorFlow } from './flavor-flow.js';
import { shareDialog, shareApp, copyAppLink } from './share.js';

let saved;
try { saved = JSON.parse(localStorage.getItem('pizzou-v2') ?? localStorage.getItem('pizzou-v1')); } catch { /* Fresh session or unavailable storage. */ }
const state = restorePreferences(saved, matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const app = document.querySelector('#app');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const boardMode = matchMedia('(min-width: 1024px), (min-width: 560px) and (orientation: landscape)');
let step = 0, result = null, toastTimer, receiptData;
let hasCalculated = false, recalculating = false, recalcTimer, orderRevision = 0;
let flavorPlan = null;
const t = () => messages[state.lang];
const slicesText = n => `${n} ${n === 1 ? t().slice : t().slices}`;
const chosenSize = () => SIZES.find(size => size.id === state.size);
const flavorFlow = new FlavorFlow({
  getOrder: () => ({result, people: state.people, size: state.size, portions: state.portions}), t,
  onComplete: plan => {flavorPlan = plan; orderRevision++; updateFlavorLaunch();},
  onReceipt: () => openReceipt(document.querySelector('.board-share, .flow-actions [data-action="receipt"]')),
  notify,
});
function flavorLaunch(l, board = false) {
  return `<button class="flavor-launch ${board ? 'share-button' : 'secondary-button'} ${flavorPlan ? 'is-decided' : ''}" data-action="flavors" aria-label="${flavorPlan ? l.flavor.done : l.flavor.launch}" title="${flavorPlan ? l.flavor.done : l.flavor.launch}" ${!result ? 'disabled' : ''}>${icon('slice')}<span>${flavorPlan ? l.flavor.done : board ? l.flavor.short : l.flavor.launch}</span></button>`;
}
function updateFlavorLaunch() {
  document.querySelectorAll('.flavor-launch').forEach(button => {
    button.querySelector('span').textContent = flavorPlan ? t().flavor.done : button.closest('.board-actions') ? t().flavor.short : t().flavor.launch;
    button.classList.toggle('is-decided', !!flavorPlan);
    button.setAttribute('aria-label', flavorPlan ? t().flavor.done : t().flavor.launch);
    button.title = flavorPlan ? t().flavor.done : t().flavor.launch;
  });
}
function boardActionsMarkup(l) {
  return `${hasCalculated ? `<button class="icon-button board-recalculate" data-action="calculate" aria-label="${l.calculate}" title="${l.calculate}">${icon('calculator')}</button>${flavorLaunch(l,true)}` : `<button class="share-button primary-action" data-action="calculate">${icon('spark')}<span>${l.calculate}</span></button>`}<button class="icon-button board-share" data-action="receipt" aria-label="${l.share}" title="${l.share}" ${!result ? 'disabled' : ''}>${icon('share')}</button>`;
}
function persist() { try { localStorage.setItem('pizzou-v2', JSON.stringify(state)); } catch { /* App still works without persistence. */ } }
function notify(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}
function animate(element, frames, duration = 420) {
  if (!reducedMotion.matches && element?.animate) element.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.3,1)' });
}
function personMarkup(level, i) {
  const l = t();
  return `<button class="person hunger-${level}" data-action="hunger" data-index="${i}" aria-label="${l.person} ${i + 1}: ${l.hunger[level]}, ${slicesText(state.portions[level])}. ${l.cycle}">
    <span class="avatar">${face(level)}</span><span class="person-copy"><span class="person-name">${l.person} ${String(i + 1).padStart(2, '0')}</span><strong>${l.hunger[level]}</strong><span class="hunger-meter" aria-hidden="true">${[0, 1, 2].map(x => `<i class="${x <= level ? 'filled' : ''}"></i>`).join('')}</span></span><span class="person-cycle" aria-hidden="true">${icon('reset')}</span></button>`;
}
function sizeScreen(l) {
  return `<section class="panel size-panel" aria-labelledby="sizes-heading"><div class="section-heading"><h2 id="sizes-heading">${l.sizes}</h2></div><p class="section-hint">${l.sizesHint}</p>
    <div class="size-grid" role="radiogroup" aria-labelledby="sizes-heading">${SIZES.map(size => `<button class="size-card ${state.size === size.id ? 'selected' : ''}" role="radio" aria-checked="${state.size === size.id}" tabindex="${state.size === size.id ? 0 : -1}" data-action="size" data-value="${size.id}"><span class="selection-check">${icon('check')}</span><span class="size-art ${size.id}">${pizza(size.slices)}</span><strong>${l.sizeNames[size.id]}</strong><span>${slicesText(size.slices)}</span></button>`).join('')}</div>
  </section>`;
}
function peopleScreen(l, showSize = true) {
  return `${showSize ? `<div class="chosen-size"><button data-action="step" data-value="0" aria-label="${l.edit}: ${l.sizeNames[state.size]}">${pizza(chosenSize().slices)}<strong>${l.sizeNames[state.size]}</strong><span>${slicesText(chosenSize().slices)}</span><span class="change-size">${l.edit}</span></button></div>` : ''}
    <section class="panel people-panel" aria-labelledby="people-heading"><div class="section-heading"><h2 id="people-heading">${l.people}</h2><div class="stepper"><button data-action="remove" class="step-button" aria-label="${l.remove}" ${state.people.length === 1 ? 'disabled' : ''}>${icon('minus')}</button><input class="people-count" aria-label="${l.peopleUnit}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${state.people.length}" /><button data-action="add" class="step-button" aria-label="${l.add}" ${state.people.length === 50 ? 'disabled' : ''}>${icon('plus')}</button></div></div>
    <p class="section-hint">${icon('reset')} ${l.tap}</p><div class="people-grid">${state.people.map(personMarkup).join('')}</div>
    <div class="hunger-key">${state.portions.map((n, i) => `<span><i class="key-dot level-${i}"></i><span>${n}</span><span class="portion-unit"> ${l.slices}</span></span>`).join('')}</div></section>`;
}
function resultScreen(l) {
  return `<section class="result-card" aria-labelledby="result-heading"><div class="result-top"><span class="result-label">${icon('spark')}${l.suggestion}</span><span class="live-badge">${icon('check')}</span></div>
    <div class="result-hero"><div class="hero-pizza" aria-hidden="true">${pizza(chosenSize().slices)}<span class="pizza-spark one">✳</span><span class="pizza-spark two">✦</span><span class="basil-leaf"></span></div><div class="result-title" id="result-heading"><strong>${result.count}</strong><h2>${result.count === 1 ? l.pizza : l.pizzas}</h2></div></div>
    <div class="order-items"><div class="order-row"><span class="order-quantity">${result.count}×</span><strong>${l.sizeNames[state.size]}</strong><span>${slicesText(chosenSize().slices)}</span></div></div>
    <div class="result-math"><span>${icon('people')}${state.people.length} ${state.people.length === 1 ? l.personUnit : l.peopleUnit}</span><span>${icon('slice')}${slicesText(result.total)}</span></div>
    <div class="leftovers ${result.extra === 0 ? 'perfect' : ''}">${icon(result.extra === 0 ? 'check' : 'slice')}<span>${result.extra === 0 ? l.perfect : `+${slicesText(result.extra)} ${l.extra}`}</span></div>
    <div class="celebration" aria-hidden="true">${Array.from({length: 12}, (_, i) => `<i style="--i:${i};--x:${7 + i * 8}%"></i>`).join('')}</div>
  </section>${flavorLaunch(l)}<p class="result-note">${l.noteHint}</p>`;
}
function boardResultMarkup(l) {
  if (result) return resultScreen(l);
  return `<section class="result-card result-placeholder ${recalculating ? 'is-updating' : ''}" aria-labelledby="pending-heading"><div class="result-top"><span class="result-label">${icon('spark')}${l.steps[3]}</span></div><div class="placeholder-content"><div class="placeholder-pizza" aria-hidden="true">${pizza(chosenSize().slices)}<span>?</span></div><h2 id="pending-heading">${recalculating ? l.updating : l.resultIdle}</h2><div class="pending-dots" aria-hidden="true"><i></i><i></i><i></i></div></div></section>`;
}
function boardScreen(l) {
  return `<main class="board-main"><div class="board-heading"><h1>${l.resultTitle}</h1><p>${l.intro}</p></div><div class="board-columns"><div class="board-pizza-column">${sizeScreen(l)}${baselineEditor(state.portions, l)}</div>${peopleScreen(l, false)}<section class="board-result-column" aria-label="${l.steps[3]}"><div class="board-result-body" aria-live="polite" aria-atomic="true" aria-busy="${recalculating}">${boardResultMarkup(l)}</div><div class="board-actions">${boardActionsMarkup(l)}</div></section></div></main>`;
}
function updateBoardResult(reveal = false) {
  const body = document.querySelector('.board-result-body');
  if (!body) return;
  body.innerHTML = boardResultMarkup(t());
  body.setAttribute('aria-busy', String(recalculating));
  document.querySelector('.board-actions').innerHTML = boardActionsMarkup(t());
  if (reveal && result) animate(body.querySelector('.result-card'), [{opacity:0, transform:'translateY(8px) scale(.98)'},{opacity:1, transform:'translateY(0) scale(1)'}], 360);
}
function invalidateResult() {
  flavorPlan = null; flavorFlow.reset();
  orderRevision++;
  clearTimeout(recalcTimer);
  result = null;
  recalculating = boardMode.matches && hasCalculated;
  updateBoardResult();
  if (recalculating) {
    // Coalesce rapid edits; an earlier order is never shown as the current result.
    recalcTimer = setTimeout(() => {
      result = calculate(state.people, state.size, state.portions);
      recalculating = false;
      updateBoardResult(true);
    }, 280);
  }
}
function render({ enter = false, back = false } = {}) {
  const l = t();
  const focusAction = document.activeElement?.dataset.action;
  const flavorWasOpen = document.querySelector("#flavor-dialog")?.open;
  const listScroll = document.querySelector(".people-grid")?.scrollTop || 0;
  app.classList.toggle("board-layout", boardMode.matches);
  document.documentElement.classList.toggle("board-viewport", boardMode.matches);
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : state.lang;
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#201f1b' : '#f7f5ef';
  document.title = `pizzou — ${l.footer}`;
  app.innerHTML = `<header class="header"><a class="brand" href="/" aria-label="pizzou">${icon('slice')}<span>pizzou<span class="brand-period">.</span></span></a>
    <div class="header-actions"><button class="icon-button" data-action="share-app" aria-label="${l.shareApp}" title="${l.shareApp}">${icon('share')}</button><div class="language-wrap"><button class="icon-button language-button" data-action="language" aria-label="${l.lang}" aria-expanded="false" aria-controls="languages">${icon('globe')}<span>${{'pt-BR':'PT',en:'EN',fr:'FR',es:'ES',zh:'中'}[state.lang]}</span></button>
    <div id="languages" class="language-menu" hidden>${Object.entries(languages).map(([key,name]) => `<button data-action="locale" data-value="${key}" lang="${key}" aria-pressed="${key === state.lang}">${name}${key === state.lang ? icon('check') : ''}</button>`).join('')}</div></div>
    ${boardMode.matches ? `<button class="icon-button" data-action="info" aria-label="${l.settings}" title="${l.settings}">${icon('info')}</button>` : ''}<span class="header-divider"></span><button class="icon-button" data-action="theme" aria-label="${l.theme}: ${state.theme === 'light' ? l.dark : l.light}">${icon(state.theme === 'light' ? 'moon' : 'sun')}</button></div></header>
    ${boardMode.matches ? boardScreen(l) : `<main class="flow-main"><nav class="flow-progress" aria-label="pizzou">${l.steps.map((name,i) => `<button data-action="step" data-value="${i}" class="progress-step ${i === step ? 'current' : ''} ${i < step ? 'complete' : ''}" ${i > step ? 'disabled' : ''} ${i === step ? 'aria-current="step"' : ''}>${icon(i < step ? 'check' : ['slice','calculator','people','spark'][i])}<span>${name}</span></button>`).join('<span class="progress-line" aria-hidden="true"></span>')}</nav>
    <div class="flow-screen ${enter ? 'is-entering' : ''} ${back ? 'is-back' : ''}" data-step="${step}"><section class="intro ${step > 0 ? 'compact-intro' : ''}">${step === 0 ? `<div class="eyebrow">${icon('slice')}${l.tip}</div>` : ''}<h1 tabindex="-1">${step === 0 ? l.title : step === 1 ? l.baseline.title : step === 2 ? l.peopleTitle : l.resultTitle}</h1><p>${step === 0 ? l.intro : step === 1 ? l.baseline.intro : step === 2 ? l.sizesHint : l.resultHint}</p><span class="intro-spark" aria-hidden="true">✳</span></section>
    ${step === 0 ? sizeScreen(l) : step === 1 ? baselineEditor(state.portions, l) : step === 2 ? peopleScreen(l) : resultScreen(l)}</div>
    <button class="how-button" data-action="info">${icon('info')}${l.settings}</button>
    <div class="flow-actions">${step > 0 ? `<button class="back-button secondary-button" data-action="step" data-value="${step - 1}">${icon(step === 3 ? 'people' : 'slice')}<span>${step === 3 ? l.edit : l.back}</span></button>` : ''}<button class="share-button primary-action" data-action="${step < 2 ? 'next' : step === 2 ? 'calculate' : 'receipt'}">${icon(step < 2 ? 'people' : step === 2 ? 'spark' : 'share')}<span>${step === 0 ? l.baseline.next : step === 1 ? l.next : step === 2 ? l.calculate : l.share}</span></button></div>
    </main>`}<footer><span>${icon('heart')}${l.footer}</span><button data-action="reset">${icon('reset')}${l.reset}</button></footer>
    <dialog id="receipt-dialog" aria-labelledby="receipt-heading"><div class="dialog-heading"><h2 id="receipt-heading">${l.receipt}</h2><button class="icon-button" data-action="close" aria-label="${l.close}">${icon('close')}</button></div><div class="receipt-preview"><img id="receipt-image" alt="${l.receiptAlt}" /></div><div class="dialog-actions"><button class="secondary-button" data-action="download">${icon('download')}${l.save}</button><button class="share-button" data-action="send">${icon('share')}${l.send}</button></div></dialog>
    <dialog id="info-dialog" class="info-dialog" aria-labelledby="info-heading"><div class="dialog-heading"><h2 id="info-heading">${l.math}</h2><button class="icon-button" data-action="close" aria-label="${l.close}">${icon('close')}</button></div><div class="info-faces">${state.portions.map((n,i) => `<div class="hunger-${i}">${face(i)}<strong>${l.hunger[i]}</strong><span>${slicesText(n)}</span></div>`).join('')}</div><p>${l.mathText}</p><p class="fine-print">${l.mathNote}</p></dialog>${flavorFlow.markup()}${shareDialog(l)}<div id="toast" role="status" class="toast"></div>`;
  flavorFlow.attach(document.querySelector("#flavor-dialog"));
  if (flavorWasOpen) flavorFlow.open();
  if (enter && !boardMode.matches && !flavorWasOpen) {
    window.scrollTo(0, 0);
    document.querySelector('h1').focus({ preventScroll:true });
  } else if (focusAction && ['theme','language','reset','share-app'].includes(focusAction)) document.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll:true });
  const grid = document.querySelector(".people-grid");
  if (grid) grid.scrollTop = listScroll;
  persist();
}
function go(nextStep) {
  const back = nextStep < step;
  step = nextStep;
  if (step < 3) result = null;
  render({ enter:true, back });
}
function closeLanguages() {
  const menu = document.querySelector('#languages');
  if (menu && !menu.hidden) { menu.hidden = true; document.querySelector('[data-action="language"]').setAttribute('aria-expanded','false'); }
}
function setCount(n) {
  const count = Math.min(50, Math.max(1, Math.trunc(n) || state.people.length));
  const oldCount = state.people.length;
  document.querySelector(".people-count").value = count;
  if (count === oldCount) return;
  state.people = Array.from({length:count}, (_,i) => state.people[i] ?? 1);
  invalidateResult();
  const grid = document.querySelector('.people-grid');
  const scroll = grid.scrollTop;
  grid.innerHTML = state.people.map(personMarkup).join('');
  grid.scrollTop = scroll;
  document.querySelector('.people-count').value = count;
  document.querySelector('[data-action="remove"]').disabled = count === 1;
  document.querySelector('[data-action="add"]').disabled = count === 50;
  if (count > oldCount) {
    // Reveal the new person inside the list; the calculate button stays in place.
    grid.scrollTop = grid.scrollHeight;
    animate(grid.lastElementChild, [{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}]);
  }
  animate(document.querySelector('.people-count'), [{transform:'scale(1.15)'},{transform:'scale(1)'}],250);
  persist();
}
async function openReceipt(button) {
  if (!result || !button) return;
  button.disabled = true;
  try {
    const snapshot = {...state, people:[...state.people], portions:[...state.portions]};
    const requestRevision = orderRevision;
    const nextReceipt = await createReceipt(snapshot,{...result, flavorPlan},t());
    if (!button.isConnected || requestRevision !== orderRevision || !result) { URL.revokeObjectURL(nextReceipt.url); return; }
    if (receiptData) URL.revokeObjectURL(receiptData.url);
    receiptData = nextReceipt;
    document.querySelector('#receipt-image').src = receiptData.url;
    document.querySelector('#receipt-dialog').showModal();
  } catch (error) { console.error(error); notify(t().failed); } finally { button.disabled = !result; }
}
function download() {
  if (!receiptData) return;
  const a = document.createElement('a'); a.href = receiptData.url; a.download = 'pizzou-pedido.png'; a.click(); notify(t().saved);
}
app.addEventListener('input', event => {
  if (!event.target.matches('.people-count')) return;
  event.target.value = event.target.value.replace(/\D/g, "");
  if (event.target.value) setCount(Number(event.target.value));
});
app.addEventListener('change', event => { if (event.target.matches('.people-count')) setCount(Number(event.target.value)); });
app.addEventListener('keydown', event => {
  const radio = event.target.closest('.size-card[role="radio"]');
  if (!radio || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const radios = [...document.querySelectorAll('.size-card[role="radio"]')];
  const current = radios.indexOf(radio);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (current + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : 2)) % 3;
  radios[next].click(); radios[next].focus();
});
app.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) { if (!event.target.closest('.language-wrap')) closeLanguages(); return; }
  const {action,index,value} = button.dataset;
  if (!['language','locale'].includes(action)) closeLanguages();
  if (action === 'baseline' && (boardMode.matches || step === 1)) {
    const i = Number(index), n = state.portions[i] + Number(value);
    const previous = [...state.portions];
    state.portions = adjustPortions(state.portions, i, n);
    if (state.portions.every((n, i) => n === previous[i])) return;
    invalidateResult();
    const scroll = document.querySelector('.board-pizza-column')?.scrollTop || 0;
    render();
    const column = document.querySelector('.board-pizza-column');
    if (column) column.scrollTop = scroll;
    state.portions.forEach((n, level) => {
      if (n !== previous[level]) animate(document.querySelectorAll('.baseline-row')[level],
        [{background:'var(--selected)',transform:'scale(.97)'},{background:'transparent',transform:'scale(1)'}], 350);
    });
    const same = document.querySelector(`[data-action="baseline"][data-index="${i}"][data-value="${value}"]`);
    const target = same.disabled ? document.querySelector(`[data-action="baseline"][data-index="${i}"]:not(:disabled)`) : same;
    target?.focus({preventScroll:true});
  }
  if (action === 'hunger' && (boardMode.matches || step === 2)) {
    state.people[Number(index)] = (state.people[Number(index)] + 1) % 3;
    invalidateResult();
    const template = document.createElement('template'); template.innerHTML = personMarkup(state.people[Number(index)], Number(index));
    const person = template.content.firstElementChild;
    button.replaceWith(person); person.focus({preventScroll:true});
    animate(person.querySelector('.avatar'), [{transform:'rotate(-16deg) scale(.75)'},{transform:'rotate(10deg) scale(1.16)',offset:.6},{transform:'rotate(0) scale(1)'}],460);
    animate(person.querySelector('.hunger-meter'), [{opacity:.3,transform:'scaleX(.7)'},{opacity:1,transform:'scaleX(1)'}],320);
    persist();
  }
  if (action === 'add' && (boardMode.matches || step === 2)) setCount(state.people.length + 1);
  if (action === 'remove' && (boardMode.matches || step === 2)) setCount(state.people.length - 1);
  if (action === 'size' && (boardMode.matches || step === 0)) {
    if (state.size !== value) { state.size = value; invalidateResult(); }
    document.querySelectorAll('.size-card').forEach(card => {
      const selected = card.dataset.value === value;
      card.classList.toggle('selected',selected); card.setAttribute('aria-checked',String(selected)); card.tabIndex = selected ? 0 : -1;
    });
    animate(button.querySelector('.pizza-art'), [{transform:'rotate(-18deg) scale(.8)'},{transform:'rotate(8deg) scale(1.12)',offset:.6},{transform:'rotate(0) scale(1)'}],500);
    animate(button.querySelector('.selection-check'), [{transform:'scale(0)'},{transform:'scale(1.25)',offset:.7},{transform:'scale(1)'}],350);
    persist();
  }
  if (action === 'next' && step < 2) go(step + 1);
  if (action === 'calculate' && (boardMode.matches || step === 2)) {
    setCount(Number(document.querySelector('.people-count').value));
    clearTimeout(recalcTimer); recalculating = false; hasCalculated = true;
    result = calculate(state.people, state.size, state.portions);
    if (boardMode.matches) updateBoardResult(true); else go(3);
    animate(document.querySelector('.result-title'), [{opacity:0,transform:'translateY(18px) scale(.75)'},{opacity:1,transform:'translateY(0) scale(1)'}],650);
  }
  if (action === 'step' && !boardMode.matches && Number(value) < step) go(Number(value));
  if (action === 'theme') { state.theme = state.theme === 'light' ? 'dark' : 'light'; render(); }
  if (action === 'language') { const menu = document.querySelector('#languages'); menu.hidden = !menu.hidden; button.setAttribute('aria-expanded',String(!menu.hidden)); if (!menu.hidden) menu.querySelector('button')?.focus(); }
  if (action === 'locale') { state.lang = value; render(); document.querySelector('[data-action="language"]').focus(); }
  if (action === 'reset') { flavorPlan = null; flavorFlow.reset(); clearTimeout(recalcTimer); hasCalculated = false; recalculating = false; orderRevision++; state.people = [1,1,1,1]; state.size = 'medium'; state.portions = [...PORTIONS]; go(0); notify(t().resetDone); }
  if (action === 'info') document.querySelector('#info-dialog').showModal();
  if (action === 'close') button.closest('dialog').close();
  if (action === 'flavors' && result) flavorFlow.open();
  if (action === 'share-app') await shareApp();
  if (action === 'copy-app') await copyAppLink(t(),notify);
  if (action === 'receipt' && (boardMode.matches || step === 3) && result) await openReceipt(button);
  if (action === 'download') download();
  if (action === 'send' && receiptData) {
    const file = new File([receiptData.blob],'pizzou-pedido.png',{type:'image/png'});
    if (navigator.canShare?.({files:[file]})) {
      try { await navigator.share({files:[file],title:'pizzou',text:t().receiptTitle}); }
      catch (error) { if (error.name !== 'AbortError') download(); }
    } else download();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { const wasOpen = !document.querySelector('#languages').hidden; closeLanguages(); if (wasOpen) document.querySelector('[data-action="language"]').focus(); }
});
app.addEventListener('click', event => {
  if (event.target.tagName !== 'DIALOG') return;
  const box = event.target.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close();
});
boardMode.addEventListener('change', () => {
  clearTimeout(recalcTimer); recalculating = false;
  if (!boardMode.matches) step = result ? 3 : Math.min(step, 2);
  render();
  window.scrollTo(0, 0);
  if (boardMode.matches && hasCalculated && !result) invalidateResult();
});
render({enter:true});
