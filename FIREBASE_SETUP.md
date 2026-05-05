# Firebase Setup Gids — KSA Bestelapp

## Wat heb je nodig?

- Een Google account
- Node.js geïnstalleerd (reeds gedaan als je Next.js draait)
- De KSA bestelapp code (dit project)

---

## Stap 1: Firebase project aanmaken

1. Ga naar [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klik op **"Project toevoegen"**
3. Geef je project een naam (bv. `ksa-bestelapp`)
4. Google Analytics: **uitschakelen** (niet nodig)
5. Klik op **"Project aanmaken"**

---

## Stap 2: Firestore Database aanmaken

1. Ga in je project naar **Firestore Database** (linkermenu)
2. Klik op **"Database aanmaken"**
3. Kies **"Begin in productiemodus"**
4. Kies een regio: **`europe-west1`** (België/Europa)
5. Klik op **"Inschakelen"**

### Firestore beveiligingsregels instellen

Ga naar **Firestore → Regels** en vervang de bestaande regels door:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Settings (wachtwoorden, schermen config)
    match /settings/{document} {
      allow read: if true;
      allow write: if true;
    }
    
    // Events en submenu zijn leesbaar voor iedereen (klanten moeten menu zien)
    match /events/{eventId} {
      allow read: if true;
      allow write: if true; // Vereenvoudigd — zie opmerking onderaan
      
      match /categories/{catId} {
        allow read: if true;
        allow write: if true;
        
        match /items/{itemId} {
          allow read: if true;
          allow write: if true;
        }
      }
      
      match /tables/{tableId} {
        allow read: if true;
        allow write: if true;
      }
      
      match /orders/{orderId} {
        allow read: if true;
        allow write: if true;
      }
      
      match /screens/{screenId} {
        allow read: if true;
        allow write: if true;
      }
    }
  }
}
```

> ⚠️ **Opmerking:** Deze regels laten iedereen lezen en schrijven. Dit is aanvaardbaar voor een intern evenement. Voor extra beveiliging kan je later Firebase Authentication toevoegen.

Klik op **"Publiceren"**.

---

## Stap 3: Web app registreren en config ophalen

1. Ga in je Firebase project naar **Projectinstellingen** (tandwieltje linksboven)
2. Scroll naar beneden naar **"Jouw apps"**
3. Klik op het **`</>`** web-icoon
4. Geef je app een naam (bv. `ksa-web`)
5. **Firebase Hosting**: **niet aanvinken** (we gebruiken Vercel)
6. Klik op **"App registreren"**
7. Je ziet nu een `firebaseConfig` object met deze waarden:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Kopieer deze waarden — je hebt ze nodig in Stap 4.

---

## Stap 4: Omgevingsvariabelen instellen

Open het bestand `.env.local` in de root van dit project en vul de waarden in die je kreeg in Stap 3:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=jouw-api-key-hier
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jouw-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jouw-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jouw-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=jouw-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=jouw-app-id

# Wachtwoorden voor bar en admin (pas deze aan!)
NEXT_PUBLIC_BAR_PASSWORD=barwachtwoord123
NEXT_PUBLIC_ADMIN_PASSWORD=adminwachtwoord456
```

> ⚠️ **Belangrijk:** Gebruik sterke, unieke wachtwoorden. Deel `.env.local` nooit publiek (het staat in `.gitignore`).

---

## Stap 5: App lokaal testen

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

- **Admin**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Barscherm**: [http://localhost:3000/bar](http://localhost:3000/bar)
- **Voorbeeld tafel**: [http://localhost:3000/tafel/test](http://localhost:3000/tafel/test)

---

## Stap 6: Online zetten met Vercel (aanbevolen)

1. Maak een account op [https://vercel.com](https://vercel.com) (gratis)
2. Verbind je GitHub account
3. Push dit project naar een GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "KSA bestelapp"
   git remote add origin https://github.com/jouw-naam/ksa-bestelapp.git
   git push -u origin main
   ```
4. Ga naar Vercel → **"New Project"** → selecteer je repository
5. Ga naar **"Environment Variables"** en voeg alle variabelen uit `.env.local` toe
6. Klik op **"Deploy"**
7. Je app is live op `https://jouw-project.vercel.app`

> 💡 **Tip voor QR-codes:** Gebruik de volledige Vercel URL (bv. `https://ksa-bestelapp.vercel.app`) als basis voor de QR-codes. Dit kun je instellen in de admin pagina.

---

## Stap 7: Eerste evenement aanmaken

1. Ga naar `/admin` en log in met je admin wachtwoord
2. Maak een nieuw evenement aan (bv. "Zomerbar 2025")
3. Activeer het evenement
4. Ga naar de **Menu** tab en voeg categorieën en items toe
5. Ga naar de **Tafels** tab en voeg tafels toe
6. Print de QR-codes via de **Tafels** tab
7. Het barscherm is bereikbaar via `/bar`

---

## Troubleshooting

### "Firebase: Error (app/no-app)"
→ Controleer of alle `NEXT_PUBLIC_FIREBASE_*` variabelen correct zijn ingevuld in `.env.local`

### Bestellingen komen niet binnen op barscherm
→ Controleer de Firestore beveiligingsregels (Stap 2)
→ Controleer of er een actief evenement is in de admin

### QR-code linkt naar localhost
→ Zorg dat je de app online hebt staan (Vercel) voordat je QR-codes print

### Wachtwoord werkt niet
→ Controleer `NEXT_PUBLIC_BAR_PASSWORD` en `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env.local`
→ Na aanpassen van `.env.local`: herstart de dev server (`npm run dev`)

---

## Benodigde packages (reeds geïnstalleerd)

| Package | Gebruik |
|---|---|
| `next` | React framework |
| `react` | UI library |
| `firebase` | Database + realtime |
| `qrcode.react` | QR-code generatie |
| `tailwindcss` | Styling |
