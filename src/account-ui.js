import {createAccountSync} from './account-sync.js';
import {mergeAccountValue} from './account-merge.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors={INVALID_EMAIL_OR_PASSWORD:'Check your email and password.',USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:'This email already has an account. Sign in or reset your password.',INVALID_OTP:'That code is not valid. Request a new code and try again.',OTP_EXPIRED:'That code expired. Request a new code.',TOO_MANY_REQUESTS:'Please wait a little before trying again.'};
export function createAccountUI({storage,doc=document,win=window,beforeReload=()=>{},loadAuth=()=>import('/account-neon.js'),formValues=form=>new FormData(form)}){
  const root=doc.getElementById('account-panel'),status=doc.getElementById('account-status');
  let authPromise=null,user=null,mode='signin',busy=false,message='',sync=null,syncState={status:'pending'},remoteChanged=false,email='';
  const canonical=win.location.hostname.endsWith('.chatgpt.site');
  async function getAuth(){if(!authPromise)authPromise=loadAuth().then(module=>module.createROQVYNAuth(win.location.origin)).catch(error=>{authPromise=null;throw error;});return authPromise;}
  async function session(){const client=await getAuth(),result=await client.getSession({query:{disableCookieCache:true}});if(result.error)throw Error('SESSION');return result.data;}
  const reload=()=>{beforeReload();win.location.reload();};
  function form(){
    const verify=mode==='verify',reset=mode==='reset',signup=mode==='signup';
    return `<form id="account-form"><h2>${verify?'Verify your email':reset?'Reset your password':signup?'Create your account':'Welcome back'}</h2><p>${verify?'Enter the verification code sent to your email.':reset?'Get a reset code in your email, then choose a new password.':'Keep your chess progress with you on every device.'}</p>${signup?'<label for="account-name">Name</label><input id="account-name" name="name" autocomplete="nickname" maxlength="80" required/>':''}<label for="account-email">Email</label><input id="account-email" name="email" type="email" autocomplete="email" value="${escape(email||user?.email)}" maxlength="254" required ${verify?'readonly':''}/>${verify||reset?'<label for="account-code">Email code</label><input id="account-code" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required/>':''}${!verify?`<label for="account-password">${reset?'New password':'Password'}</label><input id="account-password" name="password" type="password" autocomplete="${signup||reset?'new-password':'current-password'}" minlength="${signup||reset?12:1}" maxlength="128" required/>`:''}<button type="submit" class="account-primary" ${busy?'disabled':''}>${busy?'Please wait…':verify?'Verify email':reset?'Save new password':signup?'Create account':'Sign in'}</button></form><div class="account-links">${verify||reset?'<button type="button" data-account-action="code">Send a new code</button>':''}${!verify?`<button type="button" data-account-action="${signup?'signin':'signup'}">${signup?'Already have an account? Sign in':'Create an account'}</button>`:''}${mode==='signin'?'<button type="button" data-account-action="reset">Forgot password?</button>':''}${reset?'<button type="button" data-account-action="signin">Back to sign in</button>':''}</div>`;
  }
  function paint(){
    for(const link of doc.querySelectorAll('[data-account-label]'))link.textContent=storage.user?'Account':'Sign in';
    if(canonical){root.innerHTML='<h2>Your ROQVYN account</h2><p>Sign in on the main ROQVYN website to keep your progress across devices.</p><a class="account-primary" href="https://knightlab.vercel.app/account/">Open my account →</a>';return;}
    if(user?.emailVerified){
      if(storage.user?.id!==user.id){const local=Object.keys(storage.guestEntries()).length;root.innerHTML=`<h2>Hello, ${escape(user.name||'chess player')}.</h2><p>Continue with ${escape(user.email)}.</p>${local?'<label class="account-import"><input id="account-import" type="checkbox"/>Include the progress already saved on this device</label>':''}<p class="account-note">Your device’s guest progress is kept separately. Existing cloud progress will be combined.</p><button class="account-primary" data-account-action="activate" ${busy?'disabled':''}>${busy?'Loading your progress…':'Continue with this account'}</button><button class="account-secondary" data-account-action="signout">Use another account</button>`;}
      else {const descriptions={syncing:'Synchronizing your progress…',synced:'Your progress is saved across devices.',pending:'Changes are saved on this device. Synchronization is pending.',offline:'You are offline or the service is unavailable. Your progress is saved on this device.',limited:'This saved item could not upload. It remains on this device.', 'signed-out':'Sign in again to synchronize. Your progress is still saved on this device.'};root.innerHTML=`<h2>${escape(user.name||'Your account')}</h2><p>${escape(user.email)}</p><p class="account-sync-state" role="status">${descriptions[syncState.status]||descriptions.pending}</p>${syncState.at?`<p class="account-note">Last sync: ${escape(new Date(syncState.at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))}</p>`:''}${remoteChanged?'<p>Progress arrived from another device. Reload when you are ready to use it.</p><button class="account-primary" data-account-action="reload">Use updated progress</button>':''}<div class="account-actions"><button class="account-primary" data-account-action="sync" ${syncState.status==='syncing'?'disabled':''}>Sync now</button><button class="account-secondary" data-account-action="signout">Sign out</button></div>`;}
    }else root.innerHTML=form();
    status.textContent=message;status.hidden=!message;
    const formElement=doc.getElementById('account-form');if(formElement)formElement.onsubmit=submit;
  }
  function startSync(){if(sync)return;sync=createAccountSync({storage,session,fetcher:win.fetch?.bind(win),onState:value=>{syncState=value;if(value.status==='signed-out'){user=null;mode='signin';email=storage.user?.email||'';message='Sign in again to synchronize. Your device still keeps your progress.';}if(!doc.querySelector('[data-page-view="account"]')?.hidden)paint();},onRemote:()=>{remoteChanged=true;if(!doc.querySelector('[data-page-view="account"]')?.hidden)paint();}});sync.run();}
  async function check(){if(canonical)return;try{const previous=`${user?.id}:${user?.emailVerified}`,current=await session();user=current?.user||null;if(user&&!user.emailVerified){email=user.email;mode='verify';}if(storage.user&&user?.id===storage.user.id&&user.emailVerified)startSync();if(`${user?.id}:${user?.emailVerified}`!==previous)paint();}catch{message='Account services could not load. You can keep playing and retry.';status.textContent=message;status.hidden=false;}}
  async function submit(event){
    event.preventDefault();if(busy)return;const values=formValues(event.currentTarget);email=String(values.get('email')||'').trim();const password=String(values.get('password')||''),otp=String(values.get('otp')||'');busy=true;message='';paint();
    try{const client=await getAuth();let result;
      if(mode==='verify')result=await client.emailOtp.verifyEmail({email,otp});
      else if(mode==='reset')result=await client.emailOtp.resetPassword({email,otp,password});
      else if(mode==='signup')result=await client.signUp.email({email,password,name:String(values.get('name')||'').trim()});
      else result=await client.signIn.email({email,password});
      if(result.error)throw result.error;
      if(mode==='reset'){mode='signin';message='Password updated. Sign in with your new password.';}
      else {const current=await session();user=current?.user||result.data?.user||user;if(mode==='verify'&&user)user={...user,emailVerified:true};if(user&&!user.emailVerified){mode='verify';const sent=await client.emailOtp.sendVerificationOtp({email:user.email,type:'email-verification'});if(sent.error)throw sent.error;message='Check your inbox for the verification code.';}else if(storage.user?.id===user?.id)startSync();}
    }catch(error){message=errors[error.code]||'That request did not complete. Check the details or request a new code.';}
    finally{busy=false;paint();doc.getElementById(mode==='verify'?'account-code':'account-email')?.focus({preventScroll:true});}
  }
  root.addEventListener('click',async event=>{
    const action=event.target.closest('[data-account-action]')?.dataset.accountAction;if(!action||busy)return;
    if(['signin','signup','reset'].includes(action)){email=doc.getElementById('account-email')?.value.trim()||email;mode=action;message=action==='reset'?'Enter your email and use “Send a new code” to receive a reset code.':'';paint();doc.getElementById('account-email')?.focus();return;}
    if(action==='reload'){reload();return;}
    if(action==='sync'){await sync?.run();return;}
    busy=true;message='';const include=doc.getElementById('account-import')?.checked;const emailInput=doc.getElementById('account-email')?.value?.trim();paint();
    try{
      if(action==='code'){email=emailInput||email||user?.email;const result=await (await getAuth()).emailOtp.sendVerificationOtp({email,type:mode==='reset'?'forget-password':'email-verification'});if(result.error)throw result.error;message='If the address is valid, a code will arrive shortly.';}
      if(action==='activate'){
        // Read the account completely before changing this running app's scope.
        // A failed sign-in/download cannot replace or upload guest progress.
        const current=await session();if(current?.user?.id!==user.id)throw Error('SESSION');
        const headers={Authorization:'Bearer '+current.session.token},response=await win.fetch('/api/account',{headers,cache:'no-store'});if(!response.ok)throw Error('NETWORK');const manifest=await response.json(),records=[];
        for(const info of manifest.records){const r=await win.fetch('/api/account?key='+encodeURIComponent(info.key),{headers,cache:'no-store'});if(!r.ok)throw Error('NETWORK');const data=await r.json();if(data.record)records.push(data.record);}
        beforeReload();const guest=include?storage.guestEntries():{};sync?.stop();storage.activate(user);
        for(const record of records){
          const cached=storage.getItem(record.key),pending=storage.state(record.key).pending;
          storage.remote(record.key,record.value,record.version);
          if(pending&&cached!==null)storage.setItem(record.key,mergeAccountValue(record.key,cached,record.value));
        }
        for(const [key,value]of Object.entries(guest))storage.setItem(key,mergeAccountValue(key,value,storage.getItem(key)));
        win.location.reload();
      }
      if(action==='signout'){sync?.stop();sync=null;const result=await (await getAuth()).signOut();if(result.error)throw result.error;beforeReload();storage.deactivate();win.location.reload();}
    }catch{message='The request could not complete. Your saved progress is safe on this device.';if(action==='signout'&&user?.emailVerified&&storage.user?.id===user.id)startSync();}finally{busy=false;paint();}
  });
  const onOnline=()=>sync?.run(),onFocus=()=>{if(sync)sync.run();};
  win.addEventListener('online',onOnline);
  win.addEventListener('focus',onFocus);
  paint();if(storage.user&&!canonical)check();
  return {open(){paint();check();},storage,destroy(){sync?.stop();win.removeEventListener?.('online',onOnline);win.removeEventListener?.('focus',onFocus);}};
}
