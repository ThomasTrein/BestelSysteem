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
- **Bestelling weigeren / aanpassen** — Mogelijkheid om een bestelling te weigeren of aan te passen vanuit het barscherm (bv. bij uitverkoop).
- **Barmedewerker login met naam** — Elke barmedewerker logt in met naam zodat je kan zien wie welke bestelling afgehandeld heeft.
- **Automatisch archiveren** — Bestellingen die meer dan X uur geleden klaar zijn automatisch archiveren.

### Menu & Evenementen
- **Menu kopiëren van evenement** — Bij aanmaken van een nieuw evenement het menu van een vorig evenement overnemen.
- **Melding als menu uitverkocht is** — Laat de admin weten als een item al veel besteld is (bv. > X keer).
- **Meerdere actieve evenementen** — Ondersteuning voor het gelijktijdig actief hebben van meerdere evenementen (bv. binnenbar + buitenbar).

### Admin & Statistieken
- **Historiek per tafel** — Bekijk alle bestellingen van een specifieke tafel.
- **Live dashboard** — Een apart scherm met live statistieken (omzet, meest verkochte item) voor op een TV.
- **Bestelling geschiedenis per klant** — Toon alle bestellingen van dezelfde naam door het evenement heen.
- **Voorkeursinstellingen per evenement opslaan** — Sla de kolom-instelling op het barscherm op per evenement in Firestore zodat het op elk apparaat hetzelfde is.
- **Tijdslot statistieken** — Zie op welk uur de meeste bestellingen geplaatst worden (handig voor planning).
