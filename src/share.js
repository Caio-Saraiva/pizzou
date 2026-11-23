import {icon} from './graphics.js';
export const APP_URL='https://pizza.lilbigcheetos.com/';
export function shareDialog(l){return `<dialog id="share-app-dialog" class="social-dialog" aria-labelledby="share-app-heading"><div class="dialog-heading"><h2 id="share-app-heading">${l.shareApp}</h2><button class="icon-button" data-action="close" aria-label="${l.close}">${icon('close')}</button></div><input class="app-link-input" aria-label="${l.shareLink}" value="${APP_URL}" readonly/><div class="app-share-links"><a href="https://wa.me/?text=${encodeURIComponent(APP_URL)}" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://t.me/share/url?url=${encodeURIComponent(APP_URL)}" target="_blank" rel="noopener noreferrer">Telegram</a><button data-action="copy-app">${icon('copy')}${l.copyLink}</button></div><p class="app-share-hint">${l.otherApps}</p></dialog>`;}
export async function shareApp(){
  if(navigator.share){try{await navigator.share({url:APP_URL});return;}catch(error){if(error.name==='AbortError')return;}}
  document.querySelector('#share-app-dialog').showModal();
}
export async function copyAppLink(l,notify){
  try{await navigator.clipboard.writeText(APP_URL);notify(l.copied);}
  catch{const input=document.querySelector('.app-link-input');input.focus();input.select();let copied=false;try{copied=document.execCommand('copy');}catch{}notify(copied?l.copied:l.copyManual);}
}
