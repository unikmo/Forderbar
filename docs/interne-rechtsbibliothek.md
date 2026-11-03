# Forderbar – Interne Rechts- und Streitfallbibliothek (DE)

**Stand 03.11.2026 · Arbeitsfassung für synthetische Tests · keine juristische Freigabe.** Primärquellen sind amtliche Gesetze. Regeln sind Prüfhilfen, keine automatische Entscheidung über Ansprüche.

## 1. Inkassorecht und Zulässigkeit

- [RDG §§ 2–3](https://www.gesetze-im-internet.de/rdg/__2.html): Einziehung fremder Forderungen als eigenständiges Geschäft ist Inkassodienstleistung; Rechtsdienstleistungsbefugnis vor externem Tätigwerden prüfen.
- [RDG § 10](https://www.gesetze-im-internet.de/rdg/__10.html), [§ 12](https://www.gesetze-im-internet.de/rdg/__12.html): Registrierung und Voraussetzungen.
- [RDG § 13a](https://www.gesetze-im-internet.de/rdg/__13a.html): Pflichtangaben bei Inkasso gegenüber Privatpersonen; im Forderbar-Modell mit Unternehmen als Schuldner nicht schematisch übertragen.
- [RDG § 13b](https://www.gesetze-im-internet.de/rdg/__13b.html): Vorvertragliche Informationspflichten gegenüber Verbraucher-Auftraggebern, insbesondere Erfolgshonorar, Alternativen, Vergleichsbefugnis.
- [RDG §§ 13c–13g](https://www.gesetze-im-internet.de/rdg/): Vergütung, Kostenerstattung, Fremdgeld und Doppelbeauftragung prüfen.
- [RDV](https://www.gesetze-im-internet.de/rdv/): Registrierungsvoraussetzungen und Sachkunde.

## 2. Gebühren und Zinsen

- [RVG § 13](https://www.gesetze-im-internet.de/rvg/__13.html), [RVG Anlage 1 Nr. 2300/2301](https://www.gesetze-im-internet.de/rvg/anlage_1.html), [Anlage 2](https://www.gesetze-im-internet.de/rvg/anlage_2.html): gesetzliche Wertgebühren und Vergütungsverzeichnis. 2300 enthält besondere Obergrenzen für unbestrittene Inkassoforderungen und einfache Fälle. Anwendbarkeit und Erstattungsfähigkeit sind gesondert zu prüfen.
- [BGB § 286](https://www.gesetze-im-internet.de/bgb/__286.html), [§ 288](https://www.gesetze-im-internet.de/bgb/__288.html): Verzug, Verzugszinsen und Schadensersatz; keine Inkassonebenkosten ohne gesicherte Voraussetzungen.
- **Forderbar-Testtarif:** Forderung ≤ 100 EUR: 0 EUR Verbraucher-Erfolgshonorar; Forderung > 100 EUR: 10 % des tatsächlich eingezogenen Hauptforderungsbetrags. Vertragliche Ausgestaltung, Transparenz, Umsatzsteuer und Vereinbarkeit mit RDG vor Livebetrieb prüfen. Keine automatische Addition von RVG-Kosten und Erfolgshonorar.

## 3. Anspruchsprüfung und Verbraucherschutz

- [BGB §§ 195, 199](https://www.gesetze-im-internet.de/bgb/__199.html): Regelverjährung und Fristbeginn; Hemmung/Neubeginn gesondert prüfen.
- [BGB §§ 280, 281, 323, 346](https://www.gesetze-im-internet.de/bgb/__280.html): Pflichtverletzung, Schadensersatz, Rücktritt und Rückgewähr.
- [BGB §§ 312 ff., 312g, 355](https://www.gesetze-im-internet.de/bgb/__312g.html): Verbraucherfernabsatz und Widerruf mit Ausnahmen.
- [BGB §§ 433–475, insbesondere 434, 437, 439](https://www.gesetze-im-internet.de/bgb/__437.html): Kaufrecht, Sachmangel, Nacherfüllung, Rücktritt und Minderung.
- [BGB §§ 305–310](https://www.gesetze-im-internet.de/bgb/__307.html): AGB-Kontrolle.
- [BGB § 812](https://www.gesetze-im-internet.de/bgb/__812.html): Ungerechtfertigte Bereicherung.
- [BGB §§ 611a ff., 631 ff.](https://www.gesetze-im-internet.de/bgb/__631.html): Dienst- und Werkverträge.
- [UKlaG](https://www.gesetze-im-internet.de/uklag/), [UWG](https://www.gesetze-im-internet.de/uwg_2004/), [VSBG](https://www.gesetze-im-internet.de/vsbg/): Verbraucherschutz, unlautere Praktiken, Schlichtung.
- [DSGVO](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [BDSG](https://www.gesetze-im-internet.de/bdsg_2018/): Datenminimierung, Zugriff, Löschung, Rechte und sichere Dokumentenverarbeitung.

## 4. Streitfallkatalog – Hypothesen für Testpriorisierung, keine Häufigkeitsrangliste

| Falltyp | Typische Streitpunkte | Belege und Prüffragen |
|---|---|---|
| Onlinekauf/Retoure | Rückzahlung verweigert, Retoure angeblich nicht eingegangen | Bestellbestätigung, Widerruf, Versandbeleg, Erstattungszusage |
| Defekte Ware | Nacherfüllung, Gewährleistung, Beweislast | Kaufdatum, Mangelbeschreibung, Reparaturversuche, Fristen |
| Abo/Fitnessstudio | Kündigung, automatische Verlängerung, unklare Laufzeit | Vertrag, Kündigung, Zugangsbeleg, Rechnungen |
| Telekommunikation | Störung, falsche Rechnung, Vertragsverlängerung | Störungsprotokoll, Vertrag, Abrechnungen |
| Energie | Abschläge, Schlussrechnung, Guthaben | Zählerstände, Tarif, Schlussrechnung, Zahlungen |
| Reise/Flug | Stornierung, Erstattung, Verspätung | Buchung, Flug-/Reisedaten, Kommunikation, Zahlungen |
| Versicherung | Leistungsablehnung, Deckung, Fristen | Police, Schadensmeldung, Ablehnung, Nachweise |
| Fahrzeug/Werkstatt | Mangel, überhöhte Rechnung, erfolglose Reparatur | Auftrag, Rechnung, Gutachten, Mängelrüge |
| Mietkaution | Rückzahlung, Nebenkosten, Schäden | Mietvertrag, Übergabeprotokoll, Abrechnung |
| Online-Marktplatz | Nichtlieferung, Verkäuferidentität, Zahlungsweg | Bestellung, Tracking, Nachrichten, Zahlungsbeleg |
| Bank/Zahlungsdienst | Fehlbuchung, Chargeback, unautorisierte Zahlung | Kontoauszug, Reklamation, Authentifizierungsnachweis |
| Handwerker | Mangelhafte Leistung, Abnahme, Zusatzkosten | Angebot, Abnahme, Rechnung, Mängeldokumentation |

## 5. Prüflogik

1. Identität und Anspruchsinhaber; Schuldner, Vertragspartner und Forderungsgrund.
2. Vertrags-/Zahlungsbelege, Fristen, Zugangsnachweise und frühere Kontakte.
3. Fälligkeit, Rücktritt/Widerruf, Gegenansprüche, Einwendungen, Verjährung.
4. Zahlungsabgleich: Teilzahlungen, Rückerstattungen, Doppelbuchungen.
5. Mandat, Interessenkonflikt, Registrierung, Datenschutz und Gebührenoffenlegung.
6. Ergebnis: **EVIDENCE_REQUIRED**, **HUMAN_REVIEW**, **REJECT** oder **READY_FOR_CONSUMER_APPROVAL**. Kein automatisches Inkasso-Go.

**Wichtiger Grundsatz:** Bei widersprüchlichen Belegen, Rechtsunsicherheit, abweichenden Gesetzesständen oder fehlenden Pflichtangaben ist eine menschliche Prüfung erforderlich. Juristisch freigegebene Versionen müssen mit Datum und Quellenstand versioniert werden.
