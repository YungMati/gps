# RallyNav PL — MVP

Prototyp nawigacji samochodowej na iPhone'a: mapa OSM, pozycja GPS, trasa OSRM, wskazówki manewrów i synteza mowy po polsku.

## Uruchomienie

Najprościej opublikować folder jako statyczną stronę HTTPS, np. GitHub Pages, Cloudflare Pages albo Netlify. Otwórz adres w Safari na iPhonie, zezwól na lokalizację i wybierz **Udostępnij → Dodaj do ekranu początkowego**. Geolokalizacja wymaga HTTPS (localhost jest wyjątkiem).

Można też lokalnie uruchomić prosty serwer w folderze projektu:

```bash
python3 -m http.server 8080
```

Następnie otworzyć `http://localhost:8080` na komputerze. Do testu GPS na iPhonie strona musi być dostępna przez HTTPS.

## Co działa w tym MVP

- mapa ulic oparta na OpenStreetMap;
- wyszukiwanie celu w Polsce przez Nominatim;
- trasa samochodowa przez publiczny serwer OSRM;
- podstawowe wskazówki manewrów, odległości, polska synteza mowy;
- bieżąca lokalizacja i prędkość, jeśli GPS urządzenia ją udostępnia;
- lokalne pinezki zgłoszeń: korek, roboty, policja/ kontrola, zdarzenie.

## Ograniczenia — ważne

- **To prototyp, nie certyfikowana nawigacja.** Nie używaj go jako jedynego źródła wskazówek w czasie jazdy.
- Nie ma jeszcze prawdziwego, ciągłego feedu korków ani automatycznych zgłoszeń między użytkownikami. Prędkość/ETA w trasie są szacunkowe, bez korekt na ruch.
- Zgłoszenia są przechowywane tylko w bieżącej sesji na urządzeniu; nie ma backendu, kont ani synchronizacji.
- Publiczny routing, geokoder i serwer kafelków mogą ograniczać zapytania lub być niedostępne. Przed większym użyciem należy wybrać dostawcę zgodnie z jego warunkami lub utrzymywać własny serwer.
- Nie pobieraj map offline z serwera kafelków OpenStreetMap. Zachowaj widoczną atrybucję © OpenStreetMap contributors.
- Dane o utrudnieniach GDDKiA/KPD: https://kpd.gddkia.gov.pl/ — automatyczna integracja wymaga sprawdzenia aktualnych warunków dostępu, w tym rejestracji/autoryzacji.
- Lokalizacje policji, jeśli kiedykolwiek zostaną dodane, powinny być wyłącznie dobrowolnymi, datowanymi zgłoszeniami użytkowników, a nie obietnicą kompletnego śledzenia patroli.

## Pliki

- `index.html` — aplikacja
- `manifest.webmanifest` — ustawienia instalacji PWA
- `sw.js` — podstawowy cache powłoki strony

## Kolejne etapy

1. Dodać backend i bazę danych dla zgłoszeń, czas wygaśnięcia i potwierdzanie przez innych kierowców.
2. Integracja z autoryzowanym źródłem zdarzeń GDDKiA/KPD oraz normalizacja DATEX II.
3. Prawdziwy routing z uwzględnieniem utrudnień, ponowne wyznaczanie trasy i dokładniejsze dopasowanie do drogi.
4. Testy bezpieczeństwa, prywatności i działania na ekranie blokady; dla pełnej nawigacji głosowej w tle może być potrzebna natywna aplikacja iOS.

## Źródła i licencje

- Mapa i dane: OpenStreetMap, ODbL — https://www.openstreetmap.org/copyright
- Zasady kafelków OSM: https://operations.osmfoundation.org/policies/tiles/
- OSRM: https://project-osrm.org/
- KPD/GDDKiA: https://kpd.gddkia.gov.pl/
