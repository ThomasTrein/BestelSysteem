# KSA Evenementen Bestelwebsite — Plan

## Probleemstelling

De KSA organiseert regelmatig evenementen (Bingo, Zomerbar, Wijnverkoop, ...) waarbij klanten aan tafels zitten en bestellingen willen plaatsen. Het doel is een eenvoudige webapplicatie waarbij klanten via een QR-code op hun tafel hun drank/eten bestellen, en de bar de bestellingen live op een scherm ziet en kan afhandelen. Betaling gebeurt volledig buiten de app.

---

## Technologie

| Keuze | Technologie |
|---|---|
| Frontend + Backend | **Next.js** (React) |
| Database + Realtime | **Firebase** (Firestore + Auth) |
| Hosting | Firebase Hosting of Vercel |
| Taal interface | **Nederlands** |

---

## Pagina-overzicht

### 1. Klantpagina — `/tafel/[tafelId]`
- Klant scant QR-code → komt op de bestelpagina voor zijn tafel
- Toont het menu van het actieve evenement, gegroepeerd per categorie
- Prijzen zijn optioneel zichtbaar (instelbaar per evenement in admin)
- Klant kan:
  - Items selecteren met hoeveelheid
  - Een opmerking/notitie toevoegen aan de bestelling
  - Aanduiden hoeveel **drankkaarten** ze nodig hebben (0, 1, 2, ...)
  - Bestelling bevestigen
- Na bevestiging: eenvoudige **bevestigingspagina** (geen live statusopvolging)
- Klant kan meerdere bestellingen na elkaar plaatsen (nieuwe ronde)

### 2. Barscherm — `/bar`
- Beveiligd met wachtwoord
- Toont **live** alle inkomende bestellingen van het actieve evenement
- Per bestelling:
  - Tafelnummer
  - Bestelde items + hoeveelheden
  - Notitie van klant
  - Aantal gevraagde drankkaarten (als onderdeel van de bestelling)
  - Status: **Besteld** → **Klaar**
- Barmedewerker kan status wijzigen naar "Klaar"

### 3. Admin pagina — `/admin`
- Beveiligd met wachtwoord (apart van barscherm wachtwoord)

#### Evenementenbeheer
- Lijst van alle evenementen
- Nieuw evenement aanmaken (naam, datum)
- **Slechts één evenement tegelijk actief**
- Evenement activeren / deactiveren

#### Menubeheer (per evenement)
- Categorieën toevoegen/bewerken/verwijderen
- Items per categorie toevoegen/bewerken/verwijderen:
  - Naam
  - Prijs (optioneel tonen, instelbaar per evenement)
  - Item tijdelijk **uitschakelen** (bv. uitverkocht) zonder te verwijderen
- Optie: prijzen tonen aan/uitzetten per evenement

#### Tafelbeheer (per evenement)
- Tafels toevoegen met naam/nummer
- Per tafel: **QR-code genereren** (link naar `/tafel/[tafelId]`)
- QR-codes **afdrukbaar** vanuit de admin

#### Bestellingshistoriek (per evenement)
- Overzicht van alle (afgehandelde) bestellingen
- Handig voor rapportage achteraf

---

## Drankkaarten

- Bij het plaatsen van een bestelling kan de klant aanduiden hoeveel drankkaarten hij nodig heeft (spinner of +/- knop, minimum 0)
- Dit verschijnt als onderdeel van de bestelling op het barscherm (bv. "🎫 2 drankkaarten")
- Geen aparte flow — volledig geïntegreerd in de bestelflow

---

## Bestellingsflow

```
Klant scant QR → Bestelp agina laden (menu actief evenement)
  → Items selecteren + hoeveelheid
  → Notitie toevoegen (optioneel)
  → Drankkaarten aanduiden (optioneel, 0+)
  → Bestelling plaatsen
  → Bevestigingspagina getoond aan klant

Bar ontvangt live de bestelling (Firestore realtime)
  → Status: Besteld
  → Bar maakt bestelling klaar
  → Status: Klaar (bar tikt aan)
  → Bestelling geleverd aan tafel
```

---

## Authenticatie

| Pagina | Beveiliging |
|---|---|
| `/tafel/[tafelId]` | Geen — publiek toegankelijk via QR-code |
| `/bar` | Wachtwoord (apart instellen) |
| `/admin` | Wachtwoord (apart instellen) |

- Wachtwoorden worden beheerd via Firebase of een eenvoudige omgevingsvariabele
- Sessie blijft actief zolang het tabblad open is

---

## Datamodel (Firestore)

```
events/
  {eventId}/
    name: string
    date: timestamp
    active: boolean
    showPrices: boolean

    menu/
      {categoryId}/
        name: string
        order: number
        items/
          {itemId}/
            name: string
            price: number
            available: boolean
            order: number

    tables/
      {tableId}/
        name: string  // bv. "Tafel 1"

    orders/
      {orderId}/
        tableId: string
        tableName: string
        items: [{ itemId, name, quantity, price }]
        drankkaarten: number
        note: string
        status: "besteld" | "klaar"
        createdAt: timestamp
```

---

## Visuele stijl

- **Taal**: Nederlands
- **KSA kleuren/branding**: Later te bepalen (neutraal als basis, aanpasbaar via CSS variabelen of Tailwind thema)
- Responsief voor mobiel (klanten bestellen op gsm via QR)
- Barscherm geoptimaliseerd voor grotere schermen (tablet/laptop)

---

## Nog te bespreken

- [ ] Wat is de exacte werking van drankkaarten bij KSA? (fysiek kaartje, digitaal, prijs?)
- [ ] Moet de barmedewerker bestellingen kunnen **verwijderen** of **bewerken**?
- [ ] Wil je een geluidssignaal of notificatie op het barscherm bij een nieuwe bestelling?
- [ ] Moet de admin QR-codes kunnen exporteren als PDF?

---

## Fasering

### Fase 1 — Fundament
- Firebase project opzetten
- Next.js project scaffolden
- Authenticatie (wachtwoord admin + bar)
- Datamodel aanmaken

### Fase 2 — Admin
- Evenementenbeheer
- Menubeheer (categorieën + items)
- Tafelbeheer + QR-code generatie en print

### Fase 3 — Klantpagina
- Bestelformulier (menu, hoeveelheden, notitie, drankkaarten)
- Bevestigingspagina

### Fase 4 — Barscherm
- Live bestellingenweergave (Firestore realtime)
- Status aanpassen (Besteld → Klaar)

### Fase 5 — Historiek & afwerking
- Bestellingshistoriek in admin
- UI polish
- Testen op evenement
