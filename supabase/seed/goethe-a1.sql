-- مولّد من content/goethe/a1 بـtools/export_sql.py — لا تعدّله بالإيد
begin;

insert into levels (id, title, sort, published, provider, stufe) values ('goethe-a1', 'Goethe-Zertifikat A1', 0, true, 'Goethe', 'A1')
on conflict (id) do update set title = excluded.title,
  provider = coalesce(levels.provider, excluded.provider),
  stufe    = coalesce(levels.stufe,    excluded.stufe);

-- ================= modell-01 · WINFRIED =================
insert into tests (level_id, slug, title, subtitle, blocks, aufgaben, published, sort)
values ('goethe-a1', 'modell-01', 'WINFRIED', '17 Aufgaben · 45 Minuten',
        '[{"id": "block-lesen", "parts": ["lv1", "lv2", "lv3"], "title": "Lesen", "minutes": 25, "hint": "Aufgaben 1–15", "maxPoints": 15, "availablePoints": 15, "missing": 0}, {"id": "block-schreiben", "parts": ["s1", "s2"], "title": "Schreiben", "minutes": 20, "hint": "Aufgaben 16–21", "maxPoints": 15, "availablePoints": 15, "missing": 0}]'::jsonb, 17, true, 1)
on conflict (level_id, slug) do update set title = excluded.title, subtitle = excluded.subtitle, blocks = excluded.blocks, aufgaben = excluded.aufgaben, sort = excluded.sort;

insert into sections (test_id, section_id, "group", title, minutes, instruction, format, config, sort)
select t.id, v.section_id, v.grp, v.title, v.minutes, v.instruction, v.format, v.config, v.sort
from (values
    ('lv1', 'Lesen', 'Lesen, Teil 1', 10, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Einladung zum Jazz-Konzert", "b": true}, {"t": "Liebe Frau Dehner,", "b": false}, {"t": "vielen Dank für die Einladung zu Ihrem Jazz-Konzert. Ich komme gern und ich freue mich sehr auf das Konzert.", "b": false}, {"t": "Ich danke Ihnen auch, dass ich in Ihrem Gästezimmer schlafen kann und kein Hotel suchen muss. Mein Zug kommt schon um circa 16 Uhr an.", "b": false}, {"t": "Kann ich Ihnen am Nachmittag dann vor dem Konzert etwas helfen?", "b": false}, {"t": "Bis bald und herzliche Grüße", "b": false}, {"t": "Winfried Beck", "b": false}], "before": 0}, {"paragraphs": [{"t": "Betreff: Neuer Arbeitsplan", "b": true}, {"t": "Liebe Frau Jakobs,", "b": false}, {"t": "ich komme heute, Dienstag, noch nicht aus Berlin zurück.", "b": false}, {"t": "Ich habe morgen ein Gespräch mit dem Kunden Maybach. Der ist ganz wichtig für uns. Und am Donnerstag habe ich zwei weitere neue Termine.", "b": false}, {"t": "Aber am Freitag bin ich ab 8 Uhr wieder im Büro.", "b": false}, {"t": "Bitte machen Sie mir für 11 Uhr einen Termin mit Dr. Falk.", "b": false}, {"t": "Vielen Dank und herzliche Grüße", "b": false}, {"t": "Helga Stein", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 0),
    ('lv2', 'Lesen', 'Lesen, Teil 2', 10, 'Lesen Sie die Texte und die Aufgaben 6 bis 10. Wo finden Sie Informationen? Kreuzen Sie an: a oder b.', 'mc', '{"maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 1),
    ('lv3', 'Lesen', 'Lesen, Teil 3', 5, 'Lesen Sie die Texte und die Aufgaben 11 bis 15. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Vor einem Blumenladen", "b": true}, {"t": "Neu! Neu! Neu! Neu! Neu!", "b": false}, {"t": "Liebe Kunden!", "b": false}, {"t": "Ab sofort haben wir auch sonntags von 9-12 Uhr für Sie geöffnet!", "b": false}], "before": 0}, {"paragraphs": [{"t": "Im Restaurant", "b": true}, {"t": "Liebe Gäste,", "b": false}, {"t": "im nächsten Monat kocht bei uns ein Koch aus Kalkutta indische Spezialitäten.", "b": false}, {"t": "Wir freuen uns auf Ihren Besuch.", "b": false}], "before": 1}, {"paragraphs": [{"t": "Bei der Straßenbahn", "b": true}, {"t": "Linie 8:", "b": false}, {"t": "Ab 1.5. nur bis Hauptbahnhof.", "b": false}, {"t": "Zur Weiterfahrt nach Huchting: Linie 1 oder Bus Nr. 53.", "b": false}], "before": 2}, {"paragraphs": [{"t": "An einer Haustür", "b": true}, {"t": "Sehr geehrte Interessenten,", "b": false}, {"t": "es gibt leider keine Besichtigungen mehr. Die 3-Zimmer-Wohnung im 3. Stock ist schon vermietet.", "b": false}], "before": 3}, {"paragraphs": [{"t": "Im Bahnhof", "b": true}, {"t": "Sehr geehrte Fahrgäste!", "b": false}, {"t": "Ab 22 Uhr sind unsere Schalter geschlossen. Fahrkarten bekommen Sie dann an unseren Automaten.", "b": false}], "before": 4}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 2),
    ('s1', 'Schreiben', 'Schreiben, Teil 1 (Formular)', 10, 'Ihre Freundin Eva Kadavy macht mit ihrem Mann und ihren beiden Söhnen (8 und 11 Jahre alt) Urlaub in Seeheim. Im Reisebüro bucht sie für den nächsten Sonntag eine Busfahrt um den Bodensee. Frau Kadavy hat keine Kreditkarte. Helfen Sie Ihrer Freundin und schreiben Sie die fünf fehlenden Informationen in das Formular.', 'writing', '{"bankTitle": "Formular", "bankImage": "img/goethe-a1-m01-s1.jpg", "passages": [{"paragraphs": [{"t": "Bodensee-Rundfahrt Anmeldung", "b": true}, {"t": "Ihre Freundin Eva Kadavy macht mit ihrem Mann und ihren beiden Söhnen (8 und 11 Jahre alt) Urlaub in Seeheim. Im Reisebüro bucht sie für den nächsten Sonntag eine Busfahrt um den Bodensee. Frau Kadavy hat keine Kreditkarte.", "b": false}, {"t": "Helfen Sie Ihrer Freundin und schreiben Sie die fünf fehlenden Informationen in das Formular.", "b": false}], "before": 0}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 5}'::jsonb, 3),
    ('s2', 'Schreiben', 'Schreiben, Teil 2', 10, 'Schreiben Sie an Ihren Nachbarn, Herrn Maier, und bitten Sie um Hilfe. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).', 'writing', '{"passages": [{"paragraphs": [{"t": "Schreibaufgabe", "b": true}, {"t": "Sie bekommen am Dienstag einen neuen Kühlschrank. Sie müssen arbeiten. Schreiben Sie an Ihren Nachbarn, Herrn Maier, und bitten Sie um Hilfe.", "b": false}, {"t": "Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter):", "b": false}, {"t": "• Warum schreiben Sie?", "b": false}, {"t": "• Uhrzeit?", "b": false}, {"t": "• Schlüssel?", "b": false}], "before": 0}], "maxPoints": 10, "availablePoints": 10, "missing": 0, "pointsPerItem": 10}'::jsonb, 4)
) as v(section_id, grp, title, minutes, instruction, format, config, sort)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
on conflict (test_id, section_id) do update set "group" = excluded."group", title = excluded.title, minutes = excluded.minutes, instruction = excluded.instruction, format = excluded.format, config = excluded.config, sort = excluded.sort;

insert into items (section_id, item_id, text, options, points, meta, sort)
select s.id, v.item_id, v.text, v.options, v.points, v.meta, v.sort
from (values
    ('lv1', '1', 'Herr Beck übernachtet im Hotel.', null::jsonb, 1, null::jsonb, 0),
    ('lv1', '2', 'Herr Beck bietet Frau Dehner seine Hilfe an.', null::jsonb, 1, null::jsonb, 1),
    ('lv1', '3', 'Frau Stein ist in Berlin.', null::jsonb, 1, null::jsonb, 2),
    ('lv1', '4', 'Am Mittwoch hat Frau Stein frei.', null::jsonb, 1, null::jsonb, 3),
    ('lv1', '5', 'Frau Stein will am Freitag Dr. Falk treffen.', null::jsonb, 1, null::jsonb, 4),
    ('lv2', '6', 'Sie wollen viele Freunde zu Ihrem Geburtstag einladen. Sie suchen einen Ort.', '[{"key": "A", "text": "www.raum-in-koeln.de: Raum für Tanz, Sport, Hochzeiten und andere private Feiern zu vermieten. Auch abends Termine frei, günstige Preise."}, {"key": "B", "text": "www.wohnen-in-koeln.de: Schöne Zimmer und Apartments für 2 - 12 Wochen im Großraum Köln zu interessanten Preisen."}]'::jsonb, 1, null::jsonb, 0),
    ('lv2', '7', 'Der Computer ist kaputt. Sie können ihn nicht allein reparieren.', '[{"key": "A", "text": "www.computer-loesungen.de: Für alles, was mit Computern, Druckern, Scannern, Internet usw. zu tun hat. Auch Reparaturen."}, {"key": "B", "text": "www.technohaus.de: Gebrauchte Kühlschränke, Herde, Waschmaschinen, Computer, Drucker, Fernseher, Radios, Handys usw. zu supergünstigen Preisen!"}]'::jsonb, 1, null::jsonb, 1),
    ('lv2', '8', 'Sie möchten am Samstagabend mit Freunden tanzen gehen.', '[{"key": "A", "text": "www.tanzen-macht-spass.de: Tanzschule Renz. Informieren Sie sich jetzt über die neuen Tanzkurse für Jugendliche und Erwachsene. Bitte bestellen Sie unseren Tanzplan."}, {"key": "B", "text": "www.wohin-am-wochenende.de: Ins Aladin! Das neue Tanz-Restaurant! Erst gut essen, dann Tanzen - die ganze Nacht! Freitag - Samstag haben wir bis 4 Uhr geöffnet."}]'::jsonb, 1, null::jsonb, 2),
    ('lv2', '9', 'Sie möchten am Wochenende Fußball spielen.', '[{"key": "A", "text": "www.freizeitsport-freiburg.de: Basketball, Fitness, Fußball und mehr. Montags bis donnerstags 18.30 bis 21.00 Uhr im Südpark am See."}, {"key": "B", "text": "www.fc-1897.de/training: Der Fußballklub FC 1897 sucht Spieler und Spielerinnen. Treffpunkt: Sportanlage Ulrichsplatz, sonntags 10-12 Uhr. Keine Anmeldung."}]'::jsonb, 1, null::jsonb, 3),
    ('lv2', '10', 'Sie studieren und möchten ein bisschen arbeiten.', '[{"key": "A", "text": "Tel.: 0176 - 55 44 321 (Unsere Bäckerei braucht Hilfe. Wir suchen eine junge Frau / einen jungen Mann im Verkauf am Samstag von 7 bis 11 Uhr.)"}, {"key": "B", "text": "Tel.: 0160 - 683 456 20 (Junge Verkäuferin / Junger Verkäufer gesucht für Zeitungskiosk. 42 Stunden / Woche, bei guter Bezahlung.)"}]'::jsonb, 1, null::jsonb, 4),
    ('lv3', '11', 'Am Sonntagvormittag bekommen Sie hier Blumen.', null::jsonb, 1, null::jsonb, 0),
    ('lv3', '12', 'Jeden Montag bietet das Restaurant indisches Essen an.', null::jsonb, 1, null::jsonb, 1),
    ('lv3', '13', 'Es ist der 2. Mai, 21 Uhr. Sie können jetzt nicht zum Hauptbahnhof fahren.', null::jsonb, 1, null::jsonb, 2),
    ('lv3', '14', 'Sie können die Wohnung nicht besichtigen.', null::jsonb, 1, null::jsonb, 3),
    ('lv3', '15', 'Ab 22 Uhr können Sie keine Fahrkarten mehr kaufen.', null::jsonb, 1, null::jsonb, 4),
    ('s1', '16', 'Schreiben Sie die fünf fehlenden Informationen in das Formular (Aufgaben 16–20):', null::jsonb, 0, '{"points": ["(1) Anzahl der Personen: 4", "(2) Davon Kinder: 2", "(3) PLZ, Urlaubsort: Seeheim", "(4) Zahlungsweise (Bar oder Kreditkarte): Bar", "(5) Reisetermin: Sonntag"]}'::jsonb, 0),
    ('s2', '21', 'Schreiben Sie eine E-Mail oder einen kurzen Brief an Herrn Maier:', null::jsonb, 0, '{"minWords": 30, "points": ["Warum schreiben Sie?", "Uhrzeit?", "Schlüssel?"]}'::jsonb, 0)
) as v(section_id, item_id, text, options, points, meta, sort)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
join sections s on s.test_id = t.id and s.section_id = v.section_id
on conflict (section_id, item_id) do update set text = excluded.text, options = excluded.options, points = excluded.points, meta = excluded.meta, sort = excluded.sort;

insert into item_answers (item_id, answer, explanation)
select i.id, v.answer, v.explanation
from (values
    ('lv1', '1', 'f', null),
    ('lv1', '2', 'r', null),
    ('lv1', '3', 'r', null),
    ('lv1', '4', 'f', null),
    ('lv1', '5', 'r', null),
    ('lv2', '6', 'A', null),
    ('lv2', '7', 'A', null),
    ('lv2', '8', 'B', null),
    ('lv2', '9', 'B', null),
    ('lv2', '10', 'A', null),
    ('lv3', '11', 'r', null),
    ('lv3', '12', 'f', null),
    ('lv3', '13', 'f', null),
    ('lv3', '14', 'r', null),
    ('lv3', '15', 'f', null)
) as v(section_id, item_id, answer, explanation)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
join sections s on s.test_id = t.id and s.section_id = v.section_id
join items i on i.section_id = s.id and i.item_id = v.item_id
on conflict (item_id) do update set answer = excluded.answer, explanation = excluded.explanation;

commit;
