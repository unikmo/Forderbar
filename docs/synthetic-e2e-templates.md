# Forderbar – synthetische Vorlagen (nicht versenden)

Alle Texte sind Pro-forma-Muster für fiktive E2E-Tests. Keine Rechtsberatung, keine rechtliche Freigabe, keine Außenkommunikation.

## 1. White-Label-Zahlungsaufforderung – Verbraucher

Absender: {{verbraucher_name}}, {{verbraucher_anschrift}}
Empfänger: {{unternehmen_name}}, {{unternehmen_anschrift}}
Datum: {{datum}}
Betreff: Bitte um Rückzahlung – {{fallnummer}}

Sehr geehrte Damen und Herren,

ich bitte um Rückzahlung von {{hauptforderung_eur}} EUR aus {{sachverhalt}}. Die zugehörigen Belege sind {{belegliste}}.

Bitte prüfen Sie den Vorgang und überweisen Sie den berechtigten Betrag bis zum {{fristdatum}} auf das von mir angegebene Konto. Sollte Ihre Prüfung zu einem anderen Ergebnis führen, bitte ich um eine schriftliche und nachvollziehbare Begründung.

Mit freundlichen Grüßen
{{verbraucher_name}}

## 2. Inkassoschreiben – ausschließlich Pro forma

TESTMUSTER – NICHT VERSENDEN – KEIN REGISTRIERTER INKASSODIENST

Absender: {{zugelassener_dienstleister_nach_rechtlicher_freigabe}}
Empfänger: {{unternehmen_name}}
Aktenzeichen: {{fallnummer}}
Gläubiger: {{verbraucher_name}}
Hauptforderung: {{hauptforderung_eur}} EUR

Wir zeigen die Beauftragung zur Einziehung der bezeichneten Forderung an. Grundlage und Fälligkeit: {{anspruchsgrundlage_und_faelligkeit}}. Bisherige Zahlungen und Einwendungen: {{zahlungen_und_einwendungen}}.

Bitte prüfen Sie die Forderung und teilen Sie uns etwaige Einwendungen unter Angabe des Aktenzeichens mit. Eine Zahlungsfrist, Bankverbindung, Nebenforderungen und Rechtsfolgenhinweise werden erst nach individueller Prüfung, wirksamer Bevollmächtigung und rechtlicher Freigabe eingefügt.

## 3. Mandatsprotokoll – Test

Fall: {{fallnummer}}
Kunde: {{kundennummer}} / {{verbraucher_name}}
Dokumentversion: {{version}}
Dokument-Hash: {{sha256}}
Angezeigt am: {{zeitstempel}}
Ausdrückliche Zustimmung: {{ja_nein}}
Bestätigter Nutzer: {{auth_user_id}}
Widerrufs-/Informationspflichten: {{juristische_pruefung_ausstehend}}

TEST: Die Protokollierung allein begründet kein rechtswirksames Inkassomandat.

## 4. Versand- und Freigabeprotokoll

Fall: {{fallnummer}}
White-Label-Freigabe: {{freigabe_id}}
Kanal: TEST-OUTBOX
Dokument-Hash: {{sha256}}
Status: SIMULATED_ONLY
Tag-15-Entscheidung: {{PENDING_GO_NO_GO}}
Entscheider und Zeit: {{admin_id}} / {{zeitstempel}}
Externe Empfänger: KEINE

## 5. Abrechnung – Test

Hauptforderung: {{hauptforderung_eur}}
Eingegangene Teilzahlungen: {{zahlungen_eur}}
Offen: {{rest_eur}}
Verbraucher-Erfolgsprovision: 0 EUR bei Forderung bis 100 EUR; bei Forderung über 100 EUR 10 % des tatsächlich eingezogenen Hauptforderungsbetrags (geplantes Modell; Vertrags- und Rechtsprüfung vorbehalten).
Gesetzlich ersatzfähige Inkassokosten: {{nur_nach_juristischer_pruefung}}
Anrechnung / Doppelvergütung: {{juristische_pruefung}}
Erwarteter Umsatz ist kein gebuchter Umsatz.

## E2E-Gates

SUBMITTED -> SCREENING -> EVIDENCE_REVIEW -> MANDATE_REVIEW -> WHITE_LABEL_DRAFT -> CONSUMER_APPROVAL -> TEST_OUTBOX -> WAIT_14_DAYS -> HUMAN_GO -> INKASSO_TEST_DRAFT -> TEST_PAYMENT -> RECONCILIATION -> CLOSED.

Kein automatischer Versand. Keine echten Forderungen, Kundendaten oder Bankkonten. Fehlende Belege, doppelte Fälle, unklare Fälligkeit, Verjährungsrisiken, Einwendungen und fehlendes Mandat blockieren die Freigabe.