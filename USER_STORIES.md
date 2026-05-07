# User Stories – KSA Bestelapp

## Legende

| Rol | Beschrijving |
|-----|-------------|
| 🧑‍🤝‍🧑 Klant | Iemand die een bestelling plaatst via QR-code |
| 🛠 Admin | Organisator die het systeem beheert |
| 🍺 Barpersoneel | Leiding die achter de bar staat en bestellingen verwerkt |

**Snel navigeren:**
- [Klant](#klant)
- [Admin](#admin)
- [Barpersoneel](#barpersoneel)

---

## Klant

### K-01 · QR-code scannen

> **Als klant** wil ik een QR-code scannen zodat ik direct op de bestelpagina voor mijn tafel terechtkom, zonder zelf een URL te hoeven intypen.

**Te testen:** Scan de QR-code voor een specifieke tafel. Controleer of je meteen op de juiste bestelpagina landt en de tafelnaam correct wordt weergegeven.

---

### K-02 · Naam ingeven

> **Als klant** wil ik mijn naam ingeven voordat ik bestel zodat de bar weet voor wie de bestelling is.

**Te testen:** Ga naar de bestelpagina. Vul een naam in en druk op "Doorgaan". Controleer of de naam correct verschijnt in de header en op het barscherm.

---

### K-03 · Categorieën inklapbaar

> **Als klant** wil ik dat niet-drankkaartcategorieën standaard ingeklapt zijn zodat ik een overzichtelijk menu zie bij het openen.

**Te testen:** Scan een QR-code voor een tafel. Controleer dat alle categorieën (behalve drankkaarten) ingeklapt zijn. Klik op een categorie om ze uit te klappen.

---

### K-04 · Drankkaarten altijd zichtbaar

> **Als klant** wil ik dat de drankkaartensectie altijd uitgevouwen is en niet ingeklapt kan worden zodat ik ze altijd snel kan bestellen.

**Te testen:** Open de bestelpagina. Controleer dat de drankkaartensectie altijd open staat en dat er geen inklapknop is.

---

### K-05 · Items toevoegen zonder opties

> **Als klant** wil ik eenvoudige items (zonder keuzes) via +/−-knoppen kunnen toevoegen aan mijn bestelling zodat dat snel gaat.

**Te testen:** Selecteer een item zonder opties. Verhoog de hoeveelheid naar 3. Verlaag naar 1. Controleer of de teller correct bijwerkt.

---

### K-06 · Items met opties bestellen

> **Als klant** wil ik bij items met keuzemogelijkheden (bijv. vlees/veggie) mijn voorkeur kunnen opgeven zodat de bar precies weet wat ik wil.

**Te testen:** Selecteer een item met verplichte opties. Probeer toe te voegen zonder keuze te maken — controleer dat dit geblokkeerd wordt. Maak een keuze en voeg toe.

---

### K-07 · Besteloverzicht bekijken

> **Als klant** wil ik een overzicht van mijn bestelling zien voordat ik definitief bestel zodat ik fouten kan corrigeren.

**Te testen:** Voeg items toe. Klik op "Bestelling bekijken". Controleer of alle items correct worden weergegeven met de juiste hoeveelheden en opties.

---

### K-08 · Teruggaan vanuit overzicht

> **Als klant** wil ik vanuit het besteloverzicht terug kunnen gaan naar het menu zodat ik nog items kan toevoegen of wijzigen.

**Te testen:** Ga naar het besteloverzicht. Klik op "← Nog items toevoegen". Controleer dat het menu weer zichtbaar is en de eerdere selectie behouden is.

---

### K-09 · Betaalmethode selecteren voor drankkaarten

> **Als klant** wil ik een betaalmethode kiezen voor drankkaarten zodat de bar weet hoe ik ga betalen.

**Te testen:** Voeg drankkaarten toe. Ga naar het besteloverzicht. Controleer dat de betaalmethode-opties zichtbaar zijn. Probeer te bestellen zonder een keuze — er moet een foutmelding verschijnen.

---

### K-10 · Onmiddellijke foutmelding bij ontbrekende betaalmethode

> **Als klant** wil ik direct een melding zien als ik vergeet een betaalmethode te kiezen zodat ik niet het gevoel heb dat de app vastloopt.

**Te testen:** Voeg drankkaarten toe, ga naar overzicht, klik "Bestelling plaatsen" zonder betaalmethode. Controleer dat de foutmelding meteen zichtbaar is.

---

### K-11 · Bestelling plaatsen

> **Als klant** wil ik mijn bestelling definitief kunnen plaatsen vanuit het overzichtscherm zodat de bar mijn bestelling ontvangt.

**Te testen:** Vul alles correct in op het overzichtscherm. Klik "Bestelling plaatsen". Controleer dat je een bevestigingsscherm ziet en dat de bestelling verschijnt op het barscherm.

---

### K-12 · Nieuwe bestelling na bevestiging

> **Als klant** wil ik na een succesvolle bestelling een nieuwe bestelling kunnen starten zodat anderen aan dezelfde tafel ook kunnen bestellen.

**Te testen:** Nadat de bestelling is geplaatst, klik op "Nieuwe bestelling". Controleer dat het scherm reset en de naamsinvoer opnieuw verschijnt.

---

### K-13 · Donkere modus

> **Als klant** wil ik kunnen schakelen tussen lichte en donkere modus zodat het scherm comfortabel leesbaar is in elke omgeving.

**Te testen:** Klik op het zon/maan-icoon in de header. Controleer dat de gehele pagina overschakelt naar het andere thema en dat de keuze bewaard blijft.

---

### K-14 · Bestelling leegmaken

> **Als klant** wil ik mijn volledige selectie in één klik kunnen wissen zodat ik opnieuw kan beginnen zonder elk item apart te verwijderen.

**Te testen:** Selecteer meerdere items. Klik "Bestelling leegmaken". Bevestig in het pop-upvenster. Controleer dat alle items worden gewist.

---

### K-15 · Realtime menu-updates

> **Als klant** wil ik dat het menu automatisch bijgewerkt wordt als de admin iets aanpast zodat ik altijd het actuele menu ziet, zonder de pagina te herladen.

**Te testen:** Open de bestelpagina op een scherm. Voeg een nieuw item toe via het admin-paneel. Controleer dat het item verschijnt zonder dat de klant de pagina herlaadt.

---

## Admin

### A-01 · Inloggen op admin-paneel

> **Als admin** wil ik inloggen met een wachtwoord zodat onbevoegden geen toegang hebben tot het beheerpaneel.

**Te testen:** Ga naar `/admin`. Probeer in te loggen met een fout wachtwoord — controleer de foutmelding. Log in met het juiste wachtwoord.

---

### A-02 · Evenement aanmaken

> **Als admin** wil ik een nieuw evenement aanmaken met naam, datum en instellingen zodat klanten bestellingen kunnen plaatsen voor dat evenement.

**Te testen:** Ga naar het tabblad "Evenementen". Maak een nieuw evenement aan. Controleer of het verschijnt in de lijst.

---

### A-03 · Evenement activeren

> **Als admin** wil ik één evenement als actief markeren zodat QR-codes automatisch naar het juiste evenement verwijzen.

**Te testen:** Activeer een evenement. Controleer dat het als "Actief" gemarkeerd is en dat een QR-code-scan naar dat evenement verwijst.

---

### A-04 · Menu beheren

> **Als admin** wil ik categorieën en items in het menu kunnen aanmaken, bewerken en verwijderen zodat het menu altijd up-to-date is.

**Te testen:** Voeg een categorie en een item toe. Bewerk de naam van het item. Verwijder het item. Controleer alle stappen.

---

### A-05 · Items sorteren via drag-and-drop

> **Als admin** wil ik items en categorieën kunnen herordenen via slepen zodat de volgorde in het menu klopt met mijn wensen.

**Te testen:** Sleep een item naar een andere positie. Herlaad de pagina en controleer dat de volgorde bewaard is.

---

### A-06 · Tafels en QR-codes beheren

> **Als admin** wil ik tafels aanmaken en QR-codes genereren en afdrukken zodat elke tafel een unieke scan-link heeft.

**Te testen:** Maak drie tafels aan. Print de QR-codes. Controleer dat elke QR-code naar de juiste tafelpagina verwijst.

---

### A-07 · QR-codes in landscape afdrukken

> **Als admin** wil ik dat de QR-code-afdrukpagina in landschapsoriëntatie is zodat twee A5-formaten per A4-vel goed passen.

**Te testen:** Klik op "Afdrukken". Controleer dat het afdrukvenster landscape-oriëntatie toont met twee QR-codes naast/boven elkaar.

---

### A-08 · Bestellingen bekijken

> **Als admin** wil ik alle bestellingen per evenement zien met naam, tafel, items en status zodat ik een volledig overzicht heb.

**Te testen:** Ga naar "Bestellingen". Selecteer een evenement. Controleer dat alle bestellingen zichtbaar zijn met de juiste info.

---

### A-09 · Bestellingstijden per scherm bekijken

> **Als admin** wil ik zien hoelang elk barscherm nodig had om zijn deel van een bestelling te verwerken, en hoelang de volledige bestelling duurde, zodat ik de efficiëntie van de bar kan analyseren.

**Te testen:** Verwerk een bestelling volledig op alle barschermen. Ga naar "Bestellingen" in het admin-paneel. Controleer dat de tijdsduur per scherm en de totale duur worden getoond.

---

### A-10 · Bestelling bewerken

> **Als admin** wil ik een geplaatste bestelling kunnen aanpassen (items, status, opmerking) zodat ik fouten kan corrigeren.

**Te testen:** Open een bestelling. Wijzig de status naar "Klaar". Sla op. Controleer dat de status bijgewerkt is in de lijst.

---

### A-11 · Bestelling verwijderen

> **Als admin** wil ik een bestelling kunnen verwijderen zodat testbestellingen of foutieve bestellingen uit het systeem verdwijnen.

**Te testen:** Verwijder een bestelling. Bevestig in het pop-upvenster. Controleer dat de bestelling niet meer in de lijst staat.

---

### A-12 · Bestellingen exporteren naar Excel

> **Als admin** wil ik bestellingen kunnen exporteren naar Excel zodat ik ze buiten de app kan analyseren of archiveren.

**Te testen:** Klik op "Exporteer Excel". Open het bestand. Controleer dat alle bestellingen correct aanwezig zijn met de verwachte kolommen.

---

### A-13 · Wachtwoord wijzigen

> **Als admin** wil ik het admin- en barwachtwoord kunnen wijzigen via het instellingentabblad zodat de beveiliging up-to-date blijft.

**Te testen:** Verander het barwachtwoord. Log uit en probeer in te loggen op het barscherm met het nieuwe wachtwoord.

---

### A-14 · Statistieken bekijken

> **Als admin** wil ik een overzicht zien van het aantal bestellingen, vakjes en populaire items zodat ik inzicht heb in de verkoopprestaties.

**Te testen:** Ga naar het tabblad "Statistieken". Controleer dat de cijfers overeenkomen met de werkelijke bestellingen in het evenement.

---

### A-15 · Barschermen beheren

> **Als admin** wil ik barschermen aanmaken en verwijderen, elk met een naam en wachtwoord zodat de bar overzichtelijk georganiseerd is.

**Te testen:** Maak een nieuw barscherm aan. Controleer dat het scherm beschikbaar is via de gegenereerde URL.

---

## Barpersoneel

### B-01 · Inloggen op barscherm

> **Als barpersoneel** wil ik inloggen op mijn toegewezen scherm met een wachtwoord zodat ik alleen de bestellingen voor mijn scherm zie.

**Te testen:** Ga naar het scherm-URL. Voer het juiste wachtwoord in. Controleer dat je wordt doorgelaten en bestellingen ziet.

---

### B-02 · Bestellingen in realtime zien

> **Als barpersoneel** wil ik nieuwe bestellingen meteen zien verschijnen zonder de pagina te herladen zodat ik snel kan reageren.

**Te testen:** Laat een klant een bestelling plaatsen terwijl het barscherm open staat. Controleer dat de bestelling binnen enkele seconden verschijnt.

---

### B-03 · Items afzonderlijk aanvinken

> **Als barpersoneel** wil ik afzonderlijke items in een bestelling als "klaar" kunnen markeren door erop te klikken zodat ik het verloop van een bestelling kan bijhouden.

**Te testen:** Klik op een item in een actieve bestelling. Controleer dat het item doorgestreept wordt met een vinkje. Klik opnieuw om het ongedaan te maken.

---

### B-04 · Automatisch klaar bij alle items aangevinkt

> **Als barpersoneel** wil ik dat een bestelling automatisch als "Klaar" gemarkeerd wordt wanneer alle afzonderlijke items aangevinkt zijn zodat ik dit niet manueel hoef te doen.

**Te testen:** Vink alle items van een bestelling één voor één aan. Controleer dat de bestelling automatisch naar de "Klaar"-kolom verplaatst wordt.

---

### B-05 · Live timer per bestelling

> **Als barpersoneel** wil ik een live timer zien bij elke actieve bestelling zodat ik weet hoe lang een bestelling al loopt.

**Te testen:** Plaats een testbestelling. Observeer de timer op het barscherm. Controleer dat de timer elke seconde bijwerkt.

---

### B-06 · Eindtijd na voltooiing

> **Als barpersoneel** wil ik de eindtijd zien wanneer een bestelling klaar is zodat ik weet hoe lang het heeft geduurd.

**Te testen:** Markeer een bestelling als klaar. Controleer dat de timer stopt en de definitieve duur wordt weergegeven.

---

### B-07 · Bestelling ongedaan maken

> **Als barpersoneel** wil ik een als "Klaar" gemarkeerde bestelling ongedaan kunnen maken zodat ik vergissingen kan corrigeren.

**Te testen:** Markeer een bestelling als klaar via het barscherm. Klik op "Ongedaan". Controleer dat de bestelling weer als "Besteld" verschijnt.

---

### B-08 · Overzichtsscherm voor bar-manager

> **Als bar-manager** wil ik via het hoofd-barscherm alle bestellingen zien van alle schermen zodat ik het volledige overzicht heb.

**Te testen:** Open `/bar`. Log in. Controleer dat bestellingen van alle schermen zichtbaar zijn met hun respectieve status.

---

### B-09 · Schermspecifieke weergave

> **Als barpersoneel** wil ik via mijn scherm-URL alleen de bestellingen voor mijn scherm zien zodat het overzicht niet te druk is.

**Te testen:** Log in op scherm A. Verifieer dat bestellingen die aan scherm B zijn toegewezen niet zichtbaar zijn.

---

### B-10 · Klantennaam en tafelnummer zien

> **Als barpersoneel** wil ik bij elke bestelling de naam van de klant en het tafelnummer zien zodat ik de bestelling gemakkelijk kan afleveren.

**Te testen:** Controleer een bestelling op het barscherm. Verifieer dat tafelnummer en klantnaam duidelijk worden weergegeven.

---

### B-11 · Opmerking bij bestelling zien

> **Als barpersoneel** wil ik eventuele opmerkingen (bijv. allergieën) bij een bestelling zien zodat ik hier rekening mee kan houden.

**Te testen:** Plaats een bestelling met een opmerking. Controleer dat de opmerking zichtbaar is op het barscherm.

---

### B-12 · Drankkaartinfo zien

> **Als barpersoneel** wil ik zien hoeveel drankkaarten een klant bestelt en welke betaalmethode hij kiest zodat ik de afrekening correct kan verwerken.

**Te testen:** Bestel drankkaarten met een specifieke betaalmethode. Controleer dat het aantal en de betaalmethode correct worden weergegeven op het barscherm.

---
