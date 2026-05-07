# KSA Bestelapp – Mogelijke uitbreidingen & verbeterpunten

Alles wat nog toegevoegd, verbeterd of aangepast zou kunnen worden. Van klein en praktisch tot groot en ambitieus.

---

## 🍺 Barscherm & Bestellingen

- **Bestelling weigeren / aanpassen vanuit bar** — Barpersoneel kan een item als "niet beschikbaar" markeren zodat de klant een melding krijgt.
- **Barmedewerker-login met naam** — Elke medewerker logt in met naam, zodat zichtbaar is wie welke bestelling verwerkte.
- **Automatisch archiveren van oude bestellingen** — Bestellingen ouder dan X uur worden automatisch gearchiveerd en verborgen.
- **Bestellingsvolgorde handmatig aanpassen** — Barpersoneel kan de volgorde van bestellingen zelf bepalen (bv. urgent bovenaan).
- **Geluidssignaal bij nieuwe bestelling** — Optioneel geluidje of trilsignaal als een nieuwe bestelling binnenkomt.
- **Bestellingen filteren op scherm** — Op het hoofd-barscherm bestellingen filteren per scherm zonder te hoeven inloggen.
- **Kleur per scherm** — Elke barscherm krijgt een eigen kleur zodat het visueel duidelijk is welke items bij welk scherm horen.
- **Gedwongen schermwakker** — Voorkom dat het scherm van barpersoneel op standby gaat via de Wake Lock API.
- **Bestelwachtrij zichtbaar** — Zien hoeveel bestellingen in de wachtrij staan per scherm.
- **Items terug zetten als niet-klaar** — Als een item per ongeluk aangevinkt is, kan het ongedaan gemaakt worden.
- **Meldingen via browser push notifications** — Barpersoneel ontvangt een pushmelding bij een nieuwe bestelling, ook als de tab op de achtergrond staat.
- **Bestellingen groeperen per tafel** — Alle bestellingen van dezelfde tafel samenvoegen in één weergave.
- **ETA-schatting tonen aan klant** — Toon aan de klant een geschatte wachttijd op basis van de huidige wachtrij.

---

## 📋 Menu & Categorieën

- **Menu kopiëren van vorig evenement** — Bij aanmaken van een nieuw evenement het volledige menu overnemen van een bestaand evenement.
- **Item tijdelijk uitschakelen (uitverkocht)** — Een item als uitverkocht markeren zodat klanten het niet kunnen bestellen, zonder het te verwijderen.
- **Foto's bij menu-items** — Afbeeldingen toevoegen aan menu-items voor een visueel aantrekkelijker menu.
- **Beschrijving bij menu-items** — Korte beschrijving of allergieinformatie per item tonen.
- **Item populairiteit badge** — Toon een "🔥 populair" badge op items die veel besteld worden.
- **Maximale bestelling per item** — Begrens het aantal keer dat een klant hetzelfde item kan bestellen.
- **Globale bestelling-limiet per tafel** — Stel een maximum aantal vakjes of items in per tafel.
- **Zoekfunctie in het menu** — Klant kan een item opzoeken via een zoekbalk.
- **Meerdere actieve evenementen tegelijk** — Ondersteuning voor parallelle evenementen (bv. binnenbar + buitenbar).
- **Categorie-iconen** — Iconen per categorie instellen voor snellere visuele herkenning.
- **Menu preview in admin** — Admin ziet hoe het menu eruit ziet voor de klant, zonder QR-code te scannen.

---

## 🛠 Admin & Beheer

- **Twee-factor authenticatie** — Extra beveiliging voor het admin-paneel via e-mail of authenticator-app.
- **Audit log** — Bijhouden wie wanneer welke wijziging heeft gemaakt in het admin-paneel.
- **Wachtwoord per scherm** — Elk barscherm een apart wachtwoord geven voor extra beveiliging.
- **Meerdere admin-accounts** — Onderscheid tussen hoofd-admin en co-admin met beperkte rechten.
- **Menu-items importeren via Excel/CSV** — In bulk menu-items uploaden vanuit een spreadsheet.
- **Automatische back-up van bestellingen** — Dagelijkse automatische export naar Google Sheets of e-mail.
- **Evenement dupliceren** — Een volledig evenement (inclusief menu en tafels) dupliceren als sjabloon.
- **Tafels importeren via CSV** — In bulk tafelnamen importeren.
- **Bestellingen via admin plaatsen** — Admin kan manueel een bestelling plaatsen namens een tafel.
- **Activiteitslog per evenement** — Overzicht van alle acties binnen een evenement (aangemaakt, gewijzigd, verwijderd).

---

## 📊 Statistieken & Rapportage

- **Live dashboard op groot scherm** — Aparte weergave met live statistieken (aantal bestellingen, populaire items, omzet) voor op een TV.
- **Grafiek van bestellingen per tijdsslot** — Zie op welk uur de meeste bestellingen binnenkomen voor betere planning.
- **Gemiddelde bereidingstijd per scherm** — Analyseer welk barscherm het snelst werkt.
- **Populariteitsranking items** — Rangschikking van meest bestelde items per evenement.
- **Omzetrapport** — Totale omzet berekenen op basis van vakjes × prijs per slot.
- **Vergelijking tussen evenementen** — Statistieken van meerdere evenementen naast elkaar bekijken.
- **Historiek per tafel** — Bekijk alle bestellingen ooit geplaatst voor een specifieke tafel.
- **PDF-export van statistieken** — Statistieken exporteren als printbaar PDF-document.
- **Heatmap van drukke periodes** — Visuele heatmap van wanneer de bar het drukst was.

---

## 💅 UX & Interface

- **Haptic feedback op mobile** — Trilsignaal bij het aanklikken van items (via Vibration API).
- **Bestelaantal zichtbaar op categorie-header** — Toon een badge op de categorietitel met het aantal geselecteerde items.
- **Animaties bij toevoegen/verwijderen** — Subtiele animaties wanneer items worden toegevoegd of verwijderd.
- **Opmerkingsveld auto-grow** — Textarea past automatisch zijn hoogte aan op de inhoud.
- **Sticky bestelling-samenvatting** — Altijd een mini-samenvatting van de bestelling onderaan het scherm zichtbaar.
- **Swipe om te verwijderen** — Op mobiel een item verwijderen via een swipe-gebaar.
- **Kleur aanpasbaar per evenement** — De accentkleur van de app aanpassen per evenement (al geïmplementeerd, uitbreiden met volledige themakiezer).
- **Voortgangsbalk voor items per scherm** — Visuele voortgang van hoeveel items al klaar zijn per scherm.
- **Scherm-time-out melding** — Waarschuw barpersoneel als hun scherm al te lang inactief is.
- **Onboarding-tooltip** — Korte walkthrough voor nieuwe barleden bij hun eerste keer inloggen.
- **Snelkoppeling naar admin via QR** — QR-code voor directe toegang tot het admin-paneel.
- **Klantpagina taalondersteuning** — Meertalige interface (NL/FR/EN) voor internationale events.

---

## 🔒 Beveiliging

- **Rate limiting op bestellingen** — Voorkom dat een tafel te snel te veel bestellingen plaatst.
- **IP-blokkering bij misbruik** — Automatisch blokkeren van IP-adressen bij verdacht gedrag.
- **QR-code geldigheidsperiode** — QR-codes verlopen na het einde van het evenement.
- **Session timeout voor bar en admin** — Automatisch uitloggen na inactiviteit.
- **HTTPS-only afdwingen** — Redirect alle HTTP-verkeer naar HTTPS.
- **Content Security Policy headers** — Bescherming tegen XSS via strikte CSP-headers.
- **Firestore security rules versterken** — Zorgen dat klanten nooit elkaars bestellingen kunnen lezen of bewerken.
- **Admin-acties vereisen herbevestiging** — Bij kritische acties (verwijderen, wachtwoord wijzigen) een extra wachtwoordbevestiging vragen.

---

## ⚙️ Technisch & Performance

- **Service Worker / PWA** — App offline bruikbaar maken zodat barpersoneel verder kan werken bij tijdelijk netwerkverlies.
- **Optimistische UI-updates** — UI meteen updaten zonder te wachten op Firestore-bevestiging voor een snellere ervaring.
- **Firestore-caching verbeteren** — Gebruik `persistenceEnabled` zodat data lokaal gecached wordt.
- **Error boundary toevoegen** — Vang runtime-fouten op en toon een nette foutpagina.
- **Logging & monitoring** — Sentry of Firebase Crashlytics integreren voor foutopsporing in productie.
- **Unit tests voor kritieke functies** — Tests schrijven voor `handleSubmit`, `toggleItem`, prijsberekening, etc.
- **E2E-tests met Playwright** — Automatische end-to-end tests simuleren het bestelproces.
- **CI/CD pipeline** — Automatische builds en tests bij elke push via GitHub Actions.
- **Bundle size optimalisatie** — Lazy loading van zware componenten (admin-tabbladen, XLSX-export).
- **Typescript strict mode volledig inschakelen** — Alle `any`-types elimineren voor betere type-veiligheid.
- **Firestore composite indexes** — Indexen optimaliseren voor snellere queries bij grote hoeveelheden bestellingen.
- **WebSocket fallback** — Als Firestore realtime luisteren uitvalt, automatisch opnieuw verbinden.
- **Migratiescript voor schema-wijzigingen** — Automatisch bestaande Firestore-documenten bijwerken bij datamodel-wijzigingen.

---

## 🗑️ Dingen om te verwijderen of te vereenvoudigen

- **`showConfirm`-state** — De `showConfirm`-state in `tafel/[tafelId]/page.tsx` is niet meer in gebruik na de overstap naar het overzichtscherm. Kan verwijderd worden.
- **Dubbele `totalSelected`-berekening** — `totalSelected` wordt nu nog berekend maar niet meer getoond in de header. Kan vereenvoudigd worden.
- **`catInitialized` ref** — Kan vervangen worden door een duidelijkere initialisatieflow als de real-time listener refactored wordt.
- **`localStorage`-cart** — De cart-opslag in `localStorage` is onvolledig geïmplementeerd. Volledig implementeren of volledig verwijderen.
- **Onnodige re-renders in barscherm** — Het `now`-interval triggert elke seconde een re-render van alle orderkaarten. Optimaliseer met `useMemo` of `React.memo`.

