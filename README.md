This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 💡 Mogelijke uitbreidingen (suggesties)

Hier zijn een aantal ideeën die de app verder kunnen verbeteren:

### Barscherm & Bestellingen
- **Geluidssignaal bij nieuwe bestelling** — Een subtiel geluid wanneer een nieuwe bestelling binnenkomt, zodat barmedewerkers niets missen.
- **Geschatte bereidingstijd** — Stel per item in hoe lang het duurt. Toon een timer op het barscherm.
- **Bestelling weigeren / aanpassen** — Mogelijkheid om een bestelling te weigeren of aan te passen vanuit het barscherm (bv. bij uitverkoop).
- **Notificatie op het bestelscherm** — De klant ziet wanneer zijn bestelling klaar is via real-time status update.

### Menu & Evenementen
- **Uitverkocht markeren** — Snel een item als uitverkocht markeren vanuit het barscherm zonder de admin te openen.
- **Menu kopiëren van evenement** — Bij aanmaken van een nieuw evenement het menu van een vorig evenement overnemen.
- **Foto's bij menu-items** — Voeg een afbeelding toe aan een item zodat klanten weten wat ze bestellen.
- **Maximumstock per item** — Stel een maximumaantal in; automatisch onbeschikbaar bij uitverkoop.

### Admin & Statistieken
- **Export naar Excel/CSV** — Statistieken exporteren als spreadsheet voor na het evenement.
- **Historiek per tafel** — Bekijk alle bestellingen van een specifieke tafel.
- **Live dashboard** — Een apart scherm met live statistieken (omzet, meest verkochte item) voor op een TV.

### Drankkaarten
- **Drankkaart saldo bijhouden** — Registreer hoeveel drankkaarten een klant heeft en hou bij hoeveel er al gebruikt zijn.
- **Drankkaart koppelen aan naam** — Koppel drankkaarten aan een naam zodat je weet wie er nog saldo heeft.

### Algemeen
- **PWA (installeerbare app)** — Maak de website installeerbaar als app op mobiele toestellen.
- **Donker thema voor bestelscherm** — Optioneel donker thema voor klanten die 's avonds bestellen.
