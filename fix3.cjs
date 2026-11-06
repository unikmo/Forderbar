const fs=require('fs');
let r=fs.readFileSync('README.md','utf8');
function rep(t,a,b){if(!t.includes(a))throw new Error('missing '+a.slice(0,50));return t.replace(a,b)}
r=rep(r,'- Payment flows directly to the consumer initially; no assumed platform escrow.','- Payment is made by the debtor to an account designated by Forderbar; Forderbar forwards the recovered principal minus its success fee to the consumer, with a statement (see AGB §5). Handling and segregation of third-party funds is subject to legal review. Direct payment to the consumer is the exception and must be reported.');
r=rep(r,'10% of recovered principal above €100 on success','10% of the whole recovered principal for claims above €100 (from €100.01) on success');
fs.writeFileSync('README.md',r);
let h=fs.readFileSync('index.html','utf8');
h=rep(h,'Bei einem angenommenen Inkassofall soll die Zahlung grundsätzlich an die dafür vorgesehene, rechtlich zulässige Zahlstelle erfolgen. Muss eine Erstattung auf das ursprüngliche Zahlungskonto zurückgehen, fragen wir dich gezielt nach dem Eingang. Wie wir Gelder sicher entgegennehmen und abrechnen, wird vor dem Start rechtlich und technisch geprüft.','Bei einem angenommenen Fall soll das Unternehmen auf ein von Forderbar benanntes Konto zahlen. Wir leiten dir den eingezogenen Betrag abzüglich unserer Erfolgsprovision weiter und schicken dir eine Abrechnung. Zahlt das Unternehmen trotzdem direkt an dich, meldest du uns den Eingang. Wie wir Gelder sicher entgegennehmen und abrechnen, wird vor dem Start rechtlich und technisch geprüft.');
fs.writeFileSync('index.html',h);
