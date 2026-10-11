# RallyNav PL v2

Nawigacja samochodowa na iPhone'a (PWA) z pilotem rajdowym po polsku.

## Co nowego względem MVP
- **Śledzenie auta jak w Google Maps** – płynnie animowana strzałka, dopasowanie do drogi (snap-to-route), mapa obraca się zgodnie z kierunkiem jazdy, auto sam jest w dolnej części ekranu, a zoom zależy od prędkości i zbliżającego się manewru.
- **Zmiana trasy po zjechaniu z drogi** – wykrywanie zjazdu (3 odczyty GPS poza korytarzem), głosowe „Przeliczam", nowa trasa liczona z uwzględnieniem kierunku jazdy.
- **Trasy alternatywne** – podgląd do 4 tras z różnicą czasu, wybór dotknięciem linii lub kafelka.
- **Objazd zgłoszeń** – jeśli na trasie jest korek / wypadek / roboty zgłoszone przez kierowcę, pojawia się przycisk **OBJEDŹ**, który wybiera trasę omijającą zgłoszenie.
- **Satelita** – warstwy: Ciemna, Mapa (OSM), Satelita i Hybryda (Esri).
- **Pilot rajdowy** – skala jak w DiRT Rally: 6 (prawie prosto) → 1 (ciasny), kwadrat (90°) i agrafka, z kolorowymi ikonami; lewe zakręty to lustrzane odbicie. Pilot woła także **łagodne łuki na drodze** wykryte z geometrii (nie tylko skrzyżowania), np. „prawy cztery długi, potem lewy sześć". Zapowiedzi „potem…", odległość zależna od prędkości. Styl klasyczny wymienia tylko ostre zakręty.
- **Wyszukiwarka** z podpowiedziami (Photon, fallback Nominatim), ostatnie cele, wklejanie współrzędnych, **długie przytrzymanie na mapie = cel / zgłoszenie**.
- **Zgłoszenia społecznościowe (lokalnie)** – 6 typów, wygasają automatycznie, potwierdzanie / usuwanie, zapamiętywane w telefonie.
- Wake Lock (ekran nie gaśnie), wibracje, podsumowanie przejazdu, nowy interfejs.
- **Symulacja jazdy** – przycisk „Symulacja" w podglądzie trasy; przycisk „Zjedź z trasy" testuje przeliczanie. Działa też na komputerze.

- **Mapa wczytana z wyprzedzeniem** – w trakcie jazdy aplikacja w tle pobiera kafelki ok. 6 km trasy przed autem (okno kroczące) i zapisuje je w pamięci telefonu (service worker, ok. 6 MB na 6 km, odświeżane co tydzień). Wyłączane w menu. Nie pobieramy całej trasy naraz – zgodnie z polityką kafelków OSM.

- **Wybór pojazdu** – zamiast strzałki sylwetka auta z góry (Golf 5/6, Škoda Rapid, Opel Astra, sedan, kombi, SUV, rajdówka) w 8 kolorach; menu → Pojazd. Sylwetki są stylizowane, nie wierne modele.

- **Ostrzeżenia na trasie (dane OpenStreetMap przez Overpass)** – fotoradary, **odcinkowy pomiar prędkości** (wjazd, odległość do końca, **średnia prędkość na odcinku** vs limit, komunikat na końcu), kamery na czerwonym świetle, przejazdy kolejowe i opcjonalnie sygnalizacja świetlna. Znaczniki na mapie, ostrzeżenie głosowe i karta nad dolnym paskiem; poszczególne rodzaje włączasz w menu. Dane są zapamiętywane na 7 dni na telefonie.
- **Ograniczenie prędkości** – znak z limitem dla bieżącej drogi (z tagów `maxspeed` w OSM, w nawigacji dopasowane do trasy, poza nią do najbliższej drogi); prędkość czerwieni się po przekroczeniu.

### Uwaga o danych
Ostrzeżenia i limity pochodzą z OpenStreetMap (ochotnicy): bywają niekompletne, nieaktualne lub bez informacji o kierunku (możliwe fałszywe alarmy dla jezdni przeciwnej), a patrole i mobilne fotoradary nie są uwzględnione. Oficjalna mapa urządzeń CANARD (GITD) jest na canard.gitd.gov.pl, ale nie znalazłem otwartego API do jej pobrania. Yanosik nie ma publicznego API, a wyniki Google Routes API wolno pokazywać tylko na mapie Google.

## Uruchomienie
Opublikuj folder jako stronę HTTPS (GitHub Pages / Netlify / Cloudflare Pages), otwórz w Safari na iPhonie → Udostępnij → *Dodaj do ekranu początkowego*. Lokalnie: `python3 -m http.server 8080` (GPS na iPhonie wymaga HTTPS).

## Ograniczenia (nadal prawda)
- Brak danych o ruchu na żywo – ETA bez korekt na korki. Zgłoszenia nie są synchronizowane między kierowcami (to wymaga backendu).
- Publiczne serwery OSRM / Photon / Nominatim / kafelków mają limity – do produkcji potrzebny własny lub płatny dostawca.
- Kafelki Esri (satelita) i standardowe OSM (mapa i tryb ciemny – ciemny to filtr CSS na kafelkach OSM, bez klucza API; CARTO wymaga już klucza, więc zostało usunięte): sprawdź warunki użycia przy publikacji komercyjnej. Nie pobieraj kafelków OSM offline. Atrybucje są widoczne na mapie.
- Safari nie pozwala na głos w tle po zablokowaniu ekranu – do tego potrzebna natywna aplikacja.
- Prototyp, nie certyfikowana nawigacja. Trasę ustawiaj na postoju.
