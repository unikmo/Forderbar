(function(){
var TO='hello@forderbar.de';
var f=document.getElementById('contactForm');if(!f)return;
var s=document.getElementById('cStatus');
function say(t,c){s.textContent=t;s.className=c||''}
f.addEventListener('submit',function(e){
  e.preventDefault();
  var d=new FormData(f);
  if(d.get('website')){return}
  var name=(d.get('name')||'').trim(),email=(d.get('email')||'').trim(),msg=(d.get('message')||'').trim();
  if(!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||msg.length<10){say('Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht (mind. 10 Zeichen) angeben.','err');return}
  if(!document.getElementById('cConsent').checked){say('Bitte bestätige die Kenntnisnahme der Datenschutzerklärung.','err');return}
  var body=msg+'\n\n--\nName: '+name+'\nE-Mail: '+email;
  location.href='mailto:'+TO+'?subject='+encodeURIComponent('Kontaktanfrage: '+d.get('topic'))+'&body='+encodeURIComponent(body);
  say('Dein E-Mail-Programm öffnet sich mit der vorbereiteten Nachricht. Bitte dort auf „Senden“ klicken. Öffnet sich nichts, schreib uns direkt an '+TO+'.','ok');
});
})();
