# RallyNav PL

Polska nawigacja samochodowa działająca w przeglądarce i jako PWA. [Otwórz aplikację](https://yungmati.github.io/gps/).

## Pierwsza trasa

1. Dotknij **Wyszukaj adres lub miejsce**. Możesz też wpisać współrzędne, wybrać **Wskaż na mapie** albo przytrzymać miejsce na mapie.
2. Porównaj warianty według czasu i dystansu. Podgląd wskazuje, czy początkiem trasy jest odczyt GPS, czy środek mapy. Gwiazdka zapisuje cel w **Zapisanych** na tym urządzeniu.
3. Wybierz **Rozpocznij jazdę** z aktywną lokalizacją lub **Symulacja**, aby obejrzeć trasę bez jazdy. Symulator pozwala zmieniać tempo i sprawdzić przeliczanie po zjechaniu z drogi.

## Podczas jazdy

- Pilot podaje po polsku odległość i następny manewr. Tryb klasyczny korzysta z opisów drogowych, a rajdowy dodatkowo opisuje łuki wykryte z geometrii. Skala zakrętów jest dostępna w ustawieniach.
- Panel przejazdu pokazuje prędkość, orientacyjny czas przyjazdu, pozostały czas i odległość. Trasa może zostać przeliczona po zjechaniu z niej.
- W **Mapa i pilot** zmienisz warstwę mapy (ciemna, OSM, satelita, hybryda), głos, orientację, nachylenie kamery, automatyczny zoom oraz wygląd pojazdu.
- Dostępne są lokalne zgłoszenia zdarzeń, propozycje objazdu dla obsługiwanych zdarzeń, ostrzeżenia z OSM oraz podsumowanie zakończonej trasy.

## Dane i łączność

Ustawienia, ostatnie cele, zapisane miejsca i lokalne zgłoszenia są przechowywane w przeglądarce. Wyszukiwanie adresów korzysta z Photon, a po zatwierdzeniu zapytania również z Nominatim, gdy potrzeba drugiego dostawcy. Wskazanie punktu przez długie przytrzymanie pobiera jego adres. Wyznaczanie tras wysyła współrzędne startu i celu do OSRM. Dane drogowe i limity pochodzą z OpenStreetMap przez Overpass, zdjęcia satelitarne z Esri.

Powłoka PWA, biblioteka mapy i ikony są dostępne po pierwszej poprawnej instalacji również offline. Adresy, nowe trasy, ostrzeżenia i nowe fragmenty mapy wymagają dostępu do sieci. Kafelki widocznego obszaru korzystają z cache HTTP przeglądarki. Aplikacja nie pobiera pakietów map wzdłuż całej trasy. [Warunki serwera kafelków OSM](https://operations.osmfoundation.org/policies/tiles/) · [Warunki Nominatim](https://operations.osmfoundation.org/policies/nominatim/)

ETA nie uwzględnia ruchu na żywo. Zgłoszenia użytkowników są lokalne. Dane o ograniczeniach i ostrzeżeniach mogą być niepełne lub nieaktualne. Stosuj się do znaków na drodze. Publiczne serwisy map, tras i wyszukiwania mają limity dostępności.

## Uruchomienie i utrzymanie

Projekt jest statyczny. Lokalnie z katalogu repozytorium uruchom `python -m http.server 8080` i otwórz `http://localhost:8080`. Na telefonie użyj adresu HTTPS. Na iPhonie instalacja jest dostępna w Safari przez **Udostępnij → Dodaj do ekranu początkowego**. Działanie głosu i blokady wygaszania ekranu zależy od przeglądarki.

| Plik | Odpowiedzialność |
| --- | --- |
| `index.html` | Widoki planowania, nawigacji i dialogi |
| `assets/rallynav.css` | Mapa i układy dla telefonu, orientacji poziomej i komputera |
| `assets/navigation.js` | Geometria, manewry, formatowanie i symbole mapy |
| `assets/app.js` | Stan interfejsu, GPS, wyszukiwanie, routing, zapis celów i symulacja |
| `vendor/leaflet/` | Lokalna dystrybucja Leaflet 1.9.4 z licencją BSD-2-Clause |
| `sw.js`, `manifest.webmanifest` | Instalacja i pamięć podręczna aplikacji |

GitHub Pages udostępnia projekt z katalogu głównego. Przy aktualizacji zasobów powłoki zwiększ wersję cache w `sw.js`. Nowa wersja przejmuje obsługę po zamknięciu kart korzystających z poprzedniej wersji.

Testy geometrii oraz zakresu działania service workera uruchom poleceniem `node --test` (Node.js 20 lub nowszy).
