# Kehitysohjeet - Lumenoo Demo

## Tietokanta: Supabase

Projekti käyttää jo Supabasea tietokantana. Kaikki tietokantakyselyt tehdään Supabasen kautta.

### Supabase-asetukset

Projektin `.env` tiedostossa on jo Supabase-asetukset:
- `VITE_SUPABASE_URL` - Supabase-projektin URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Julkinen API-avain
- `VITE_SUPABASE_PROJECT_ID` - Projektin ID

Jos haluat käyttää omaa Supabase-projektia:

1. Luo uusi projekti [Supabase Dashboardissa](https://supabase.com/dashboard)
2. Päivitä `.env` tiedoston arvot:
   ```
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   ```
3. Aja migraatiot Supabase-projektiisi:
   ```bash
   # Jos sinulla on Supabase CLI asennettuna:
   supabase db push
   
   # Tai kopioi migraatiotiedostot manuaalisesti Supabase Dashboardin SQL Editoriin
   ```

### Migraatiot

Projektin migraatiotiedostot löytyvät `supabase/migrations/` hakemistosta. Varmista että ne on ajettu Supabase-projektiisi.

## Lokaali kehitys

### 1. Asenna riippuvuudet

```bash
npm install
```

### 2. Käynnistä kehityspalvelin

```bash
npm run dev
```

Sovellus käynnistyy osoitteessa: **http://localhost:8080**

### 3. Avaa selaimessa

Avaa selain ja mene osoitteeseen `http://localhost:8080` nähdäksesi miltä sivusi näyttää.

## Muut komennot

- `npm run build` - Rakenna tuotantoversio
- `npm run preview` - Esikatsele tuotantoversio
- `npm run lint` - Tarkista koodin laatu

## Tärkeää

- Varmista että `.env` tiedosto on olemassa ja sisältää oikeat Supabase-asetukset
- Jos käytät omaa Supabase-projektia, muista ajaa migraatiot
- Kehityspalvelin päivittyy automaattisesti kun teet muutoksia koodiin
