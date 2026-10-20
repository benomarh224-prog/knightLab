export function createAudioSettings(audio,{doc=document,beforeOpen=()=>{}}={}){
  const dialog=doc.getElementById('audio-settings-dialog'),enabled=doc.getElementById('audio-enabled'),volume=doc.getElementById('audio-volume'),output=doc.getElementById('audio-volume-value');
  const paint=()=>{enabled.checked=audio.enabled;volume.value=Math.round(audio.volume*100);output.value=volume.value+'%';for(const button of doc.querySelectorAll('[data-audio-open]'))button.setAttribute('aria-label',`Sound settings · ${audio.enabled&&audio.volume?'on':'off'}`);};
  for(const button of doc.querySelectorAll('[data-audio-open]'))button.addEventListener('click',()=>{beforeOpen();paint();dialog.showModal();});
  doc.getElementById('audio-settings-close').onclick=()=>dialog.close();
  enabled.onchange=()=>{audio.setEnabled(enabled.checked);if(audio.enabled)audio.unlock();paint();};
  volume.oninput=()=>{audio.setVolume(Number(volume.value)/100);paint();};
  const unlock=event=>{if(event.isTrusted&&(event.type!=='keydown'||!event.repeat))audio.unlock();};
  doc.addEventListener('pointerdown',unlock,true);doc.addEventListener('keydown',unlock,true);
  audio.preload();paint();return {paint};
}
