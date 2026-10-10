# RallyNav PL v2

Nawigacja samochodowa na iPhone'a (PWA) z pilotem rajdowym po polsku.

## Co nowego względem MVP
- **Śledzenie auta jak w Google Maps** – płynnie animowana strzałka, dopasowanie do drogi (snap-to-route), mapa obraca się zgodnie z kierunkiem jazdy, auto sam jest w dolnej części ekranu, a zoom zależy od prędkości i zbliżającego się manewru.
- **Zmiana trasy po zjechaniu z drogi** – wykrywanie zjazdu (3 odczyty GPS poza korytarzem), głosowe „Przeliczam", nowa trasa liczona z uwzględnieniem kierunku jazdy.
- **Trasy alternatywne** – podgląd do 4 tras z różnicą czasu, wybór dotknięciem linii lub kafelka.
- **Objazd zgłoszeń** – jeśli na trasie jest korek / wypadek / roboty zgłoszone przez kierowcę, pojawia się przycisk **OBJEDŹ**, który wybiera trasę omijającą zgłoszenie.
- **Satelita** – warstwy: Ciemna, Mapa (OSM), Satelita i Hybryda (Esri).
- **Pilot rajdowy** – numerowane zakręty liczone z geometrii („prawy trzy", „agrafka w lewo"), zapowiedzi „potem…", odległość zapowiedzi zależna od prędkości. Można przełączyć na styl klasyczny.
- **Wyszukiwarka** z podpowiedziami (Photon, fallback Nominatim), ostatnie cele, wklejanie współrzędnych, **długie przytrzymanie na mapie = cel / zgłoszenie**.
- **Zgłoszenia społecznościowe (lokalnie)** – 6 typów, wygasają automatycznie, potwierdzanie / usuwanie, zapamiętywane w telefonie.
- Wake Lock (ekran nie gaśnie), wibracje, podsumowanie przejazdu, nowy interfejs.
- **Symulacja jazdy** – przycisk „Symulacja" w podglądzie trasy; przycisk „Zjedź z trasy" testuje przeliczanie. Działa też na komputerze.

## Uruchomienie
Opublikuj folder jako stronę HTTPS (GitHub Pages / Netlify / Cloudflare Pages), otwórz w Safari na iPhonie → Udostępnij → *Dodaj do ekranu początkowego*. Lokalnie: `python3 -m http.server 8080` (GPS na iPhonie wymaga HTTPS).

## Ograniczenia (nadal prawda)
- Brak danych o ruchu na żywo – ETA bez korekt na korki. Zgłoszenia nie są synchronizowane między kierowcami (to wymaga backendu).
- Publiczne serwery OSRM / Photon / Nominatim / kafelków mają limity – do produkcji potrzebny własny lub płatny dostawca.
- Kafelki Esri i CARTO: sprawdź warunki użycia przy publikacji komercyjnej. Nie pobieraj kafelków OSM offline. Atrybucje są widoczne na mapie.
- Safari nie pozwala na głos w tle po zablokowaniu ekranu – do tego potrzebna natywna aplikacja.
- Prototyp, nie certyfikowana nawigacja. Trasę ustawiaj na postoju.
