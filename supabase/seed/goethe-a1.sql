-- مولّد من content/goethe/a1 بـtools/export_sql.py — لا تعدّله بالإيد
begin;

insert into levels (id, title, sort, published, provider, stufe) values ('goethe-a1', 'Goethe-Zertifikat A1', 0, true, 'Goethe', 'A1')
on conflict (id) do update set title = excluded.title,
  provider = coalesce(levels.provider, excluded.provider),
  stufe    = coalesce(levels.stufe,    excluded.stufe);

-- ================= modell-01 · Goethe A1 — Üben =================
insert into tests (level_id, slug, title, subtitle, blocks, aufgaben, published, sort)
values ('goethe-a1', 'modell-01', 'Goethe A1 — Üben', 'Lesen · Schreiben',
        '[{"id": "lv1", "parts": ["lv1-01", "lv1-02", "lv1-03", "lv1-04", "lv1-05", "lv1-06", "lv1-07", "lv1-08", "lv1-09", "lv1-10"], "title": "Lesen · Teil 1", "minutes": 0, "maxPoints": 50, "availablePoints": 51, "missing": 0}, {"id": "s1", "parts": ["s1"], "title": "Schreiben · Teil 1 (Formular)", "minutes": 10, "maxPoints": 5, "availablePoints": 5, "missing": 0}, {"id": "s2", "parts": ["s2"], "title": "Schreiben · Teil 2 (Brief)", "minutes": 10, "maxPoints": 10, "availablePoints": 10, "missing": 0}]'::jsonb, 53, true, 1)
on conflict (level_id, slug) do update set title = excluded.title, subtitle = excluded.subtitle, blocks = excluded.blocks, aufgaben = excluded.aufgaben, sort = excluded.sort;

insert into sections (test_id, section_id, "group", title, minutes, instruction, format, config, sort)
select t.id, v.section_id, v.grp, v.title, v.minutes, v.instruction, v.format, v.config, v.sort
from (values
    ('lv1-01', 'Lesen', 'Übung 1', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Einladung zum Jazz-Konzert", "b": true}, {"t": "Liebe Frau Dehner,", "b": false}, {"t": "vielen Dank für die Einladung zu Ihrem Jazz-Konzert. Ich komme gern und ich freue mich sehr auf das Konzert.", "b": false}, {"t": "Ich danke Ihnen auch, dass ich in Ihrem Gästezimmer schlafen kann und kein Hotel suchen muss. Mein Zug kommt schon um circa 16 Uhr an.", "b": false}, {"t": "Kann ich Ihnen am Nachmittag dann vor dem Konzert etwas helfen?", "b": false}, {"t": "Bis bald und herzliche Grüße", "b": false}, {"t": "Winfried Beck", "b": false}], "before": 0}, {"paragraphs": [{"t": "Betreff: Neuer Arbeitsplan", "b": true}, {"t": "Liebe Frau Jakobs,", "b": false}, {"t": "ich komme heute, Dienstag, noch nicht aus Berlin zurück.", "b": false}, {"t": "Ich habe morgen ein Gespräch mit dem Kunden Maybach. Der ist ganz wichtig für uns. Und am Donnerstag habe ich zwei weitere neue Termine.", "b": false}, {"t": "Aber am Freitag bin ich ab 8 Uhr wieder im Büro.", "b": false}, {"t": "Bitte machen Sie mir für 11 Uhr einen Termin mit Dr. Falk.", "b": false}, {"t": "Vielen Dank und herzliche Grüße", "b": false}, {"t": "Helga Stein", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 0),
    ('lv1-02', 'Lesen', 'Übung 2', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Hallo Li", "b": true}, {"t": "Hallo Li,", "b": false}, {"t": "danke für deine Mail. Dein Zug kommt hier in Hannover um 12.36 Uhr an. Ich bin ab 12.15 Uhr im Hauptbahnhof und warte auf dich vor der Auskunft.", "b": false}, {"t": "Du kannst mich den ganzen Vormittag auf meinem Handy (++49 173 62 205 59) erreichen.", "b": false}, {"t": "Deine Karin", "b": false}], "before": 0}, {"paragraphs": [{"t": "Liebe Carmen", "b": true}, {"t": "Liebe Carmen,", "b": false}, {"t": "am kommenden Sonntag habe ich Geburtstag. Ich möchte gerne mit dir feiern und lade dich herzlich zu meiner Party am Samstagabend ein.", "b": false}, {"t": "Wir fangen um 21 Uhr an. Ist das okay für dich? Es werden viele Leute da sein, die du auch kennst.", "b": false}, {"t": "Kannst du vielleicht einen Salat mitbringen? Und vergiss bitte nicht einen Pullover oder eine Jacke! Wir wollen nämlich draußen im Garten feiern.", "b": false}, {"t": "Ich freue mich sehr auf dich!", "b": false}, {"t": "Bis zum Wochenende", "b": false}, {"t": "Ralf", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 1),
    ('lv1-03', 'Lesen', 'Übung 3', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Liebe Nora", "b": true}, {"t": "Liebe Nora,", "b": false}, {"t": "ich bin nächste Woche drei Tage – von Montag bis Mittwoch – in Weimar. Ich muss viel arbeiten, habe viele Termine. Aber am Dienstag ab 18.00 Uhr habe ich Zeit. Können wir uns dann sehen?", "b": false}, {"t": "Ich wohne im Hotel „Drei Kronen\" in der Parkstraße. Das Hotel hat ein sehr gutes Restaurant. Wir können dorthin gehen. Was denkst du? Ich freue mich auf dich!", "b": false}, {"t": "Alles Liebe", "b": false}, {"t": "Renate", "b": false}], "before": 0}, {"paragraphs": [{"t": "Liebe Sportsfreunde vom Verein 1896", "b": true}, {"t": "Liebe Sportsfreunde vom Verein 1896,", "b": false}, {"t": "auch dieses Jahr wollen wir wieder unseren Sommerausflug machen. Wir fahren mit dem Bus an den Dümmer See. Dort wollen wir wandern und in einem netten Restaurant zu Mittag essen.", "b": false}, {"t": "Abfahrt ist am 27. Juni um 9 Uhr vor dem Vereinshaus. Die Busfahrt kostet 10 Euro pro Person; das Essen und die Getränke zahlt jeder allein.", "b": false}, {"t": "Liebe Freunde, bitte meldet euch bald an!", "b": false}, {"t": "Bis dann", "b": false}, {"t": "Heinz Paschke", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 2),
    ('lv1-04', 'Lesen', 'Übung 4', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Hallo Christian", "b": true}, {"t": "Hallo Christian,", "b": false}, {"t": "ich verstehe Deine Mail nicht! Hast Du nun eine neue Wohnung oder nicht? Und wie geht es mit dem Studium?", "b": false}, {"t": "Wir wollen uns am Samstag alle treffen und vielleicht im chinesischen Restaurant essen. Kommst Du mit? Michi und Carola sind auch dabei, und noch zwei Freunde von mir aus Berlin. Sie sind auch sehr nett.", "b": false}, {"t": "Ruf mich auf dem Handy an, okay?", "b": false}, {"t": "Matthias", "b": false}], "before": 0}, {"paragraphs": [{"t": "Liebe Frau Müller", "b": true}, {"t": "Liebe Frau Müller,", "b": false}, {"t": "Sie wissen ja, ich wohne seit sechs Monaten in dem kleinen Apartment neben Ihrer Wohnung. Im Moment bin ich aber nicht in Leipzig, ich bin in London und mache ein Praktikum bei British Airways, das ist sehr wichtig für mein Studium.", "b": false}, {"t": "Am Wochenende kommt meine Schwester nach Leipzig und sie möchte in meiner Wohnung übernachten. Sie hat einen Schlüssel für die Wohnung, aber sie kann vielleicht das Gas nicht anmachen, und das Licht und Wasser usw. – da gibt es sicher ein paar Probleme! Können Sie ihr bitte helfen?", "b": false}, {"t": "Ich danke Ihnen, Sie sind wirklich sehr freundlich!", "b": false}, {"t": "Im Juli bin ich wieder in Leipzig, bis dahin ganz herzliche Grüße von", "b": false}, {"t": "Michaela Berger", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 3),
    ('lv1-05', 'Lesen', 'Übung 5', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Hallo Jasmin", "b": true}, {"t": "Hallo Jasmin,", "b": false}, {"t": "ich habe morgen frei! Ich kann schon am Mittag nach Berlin kommen und nicht erst abends spät. Kannst du mich abholen? Mein Zug kommt um 12.30 Uhr an. Am besten treffen wir uns vor dem Bahnhof, dann warte ich auf dich. Ist das okay für dich? Schreib mir bitte schnell oder ruf mich an.", "b": false}, {"t": "Bis morgen, ich freue mich.", "b": false}, {"t": "Roberto", "b": false}], "before": 0}, {"paragraphs": [{"t": "Liebe Claudia, lieber Holger", "b": true}, {"t": "Liebe Claudia, lieber Holger,", "b": false}, {"t": "wir haben seit zwei Wochen endlich eine neue Wohnung, sehr hell und groß, 85 m². Und sie hat einen schönen Balkon (Südseite!).", "b": false}, {"t": "Am nächsten Samstag wollen wir eine kleine Party machen, so ab 18 Uhr. Viele Leute kommen, auch Leute aus dem Haus. Die Nachbarn hier sind sehr nett.", "b": false}, {"t": "Habt ihr auch Zeit und Lust? Dann könnt ihr euch die Wohnung ansehen. Wir machen auch ein kleines Essen. Ihr könnt gerne noch etwas zu trinken mitbringen und vielleicht auch Musik, unsere CDs sind nämlich noch in der alten Wohnung.", "b": false}, {"t": "Könnt ihr kommen? Schreibt uns doch eine kurze Mail. Ach ja, die Adresse ist Sandweg 12, 3. Stock.", "b": false}, {"t": "Dann hoffentlich bis Samstag, viele Grüße", "b": false}, {"t": "Karin + Tom", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 4),
    ('lv1-06', 'Lesen', 'Übung 6', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Sehr geehrte Frau Helbich", "b": true}, {"t": "Sehr geehrte Frau Helbich,", "b": false}, {"t": "ich möchte meine Tochter Andrea entschuldigen. Sie hat Fieber und kann nicht zur Schule kommen. Nächste Woche kann sie wieder kommen. Können Sie mir bitte die Hausaufgaben sagen – am besten per Mail?", "b": false}, {"t": "Danke und viele Grüße", "b": false}, {"t": "Julia Schmidt", "b": false}], "before": 0}, {"paragraphs": [{"t": "Hallo Robert", "b": true}, {"t": "Hallo Robert,", "b": false}, {"t": "wie geht es dir? Du, Robert, wir möchten nächsten Sommer an der Nordsee Urlaub machen. Du warst doch letzten Sommer dort. Kannst du mir ein paar Tipps geben, kannst du mir etwas empfehlen? Vielleicht fahren wir auch ein paar Tage nach Hamburg. Kennst du gute Hotels? Welche Sehenswürdigkeiten gibt es dort?", "b": false}, {"t": "Wir können uns ja bald mal wieder treffen. Dann lade ich dich zu einem Glas Wein ein.", "b": false}, {"t": "Viele Grüße", "b": false}, {"t": "Fabian", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 5),
    ('lv1-07', 'Lesen', 'Übung 7', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Hallo Kristina", "b": true}, {"t": "Hallo Kristina,", "b": false}, {"t": "vielen Dank für die Einladung zu deiner Party. Ich komme gern. Du schreibst, ich kann bei dir übernachten. Vielen Dank! Dann muss ich kein Hotel suchen.", "b": false}, {"t": "Ich habe noch eine Frage: Kann ich auch meine Freundin Andrea mitbringen? Sie kommt aus Spanien und ist zurzeit bei mir auf Besuch. Schreib mir kurz! Danke und bis bald.", "b": false}, {"t": "Ich freue mich auf die Party!", "b": false}, {"t": "Liebe Grüße", "b": false}, {"t": "Maria", "b": false}], "before": 0}, {"paragraphs": [{"t": "Lieber Herr Schmidt", "b": true}, {"t": "Lieber Herr Schmidt,", "b": false}, {"t": "vielen Dank für Ihre Mail. Leider kann ich Sie am Montag, dem 18. März, um 15 Uhr nicht besuchen. Ich habe an diesem Tag noch andere Kundentermine.", "b": false}, {"t": "Wir können uns aber nach 19 Uhr treffen oder gerne auch am 19. März. An diesem Tag habe ich den ganzen Tag frei.", "b": false}, {"t": "Viele Grüße", "b": false}, {"t": "Georg Bauer", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 6),
    ('lv1-08', 'Lesen', 'Übung 8', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 6. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Sehr geehrter Herr Lohmann", "b": true}, {"t": "Sehr geehrter Herr Lohmann,", "b": false}, {"t": "leider kann ich morgen, am Donnerstag, nicht zu unserem Termin nach Berlin kommen. Ich hatte im Urlaub einen Unfall mit dem Fahrrad. Mein Bein tut sehr weh und ich glaube, ich habe auch ein bisschen Fieber.", "b": false}, {"t": "Morgen muss ich deshalb zum Arzt gehen. Ich rufe Sie morgen Abend an. Wir können dann einen anderen Termin ausmachen.", "b": false}, {"t": "Viele Grüße", "b": false}, {"t": "Franz Bauer", "b": false}], "before": 0}, {"paragraphs": [{"t": "Information der Arztpraxis Dr. Scholl", "b": true}, {"t": "Liebe Patienten,", "b": false}, {"t": "wir sind im Urlaub. In dringenden Fällen können Sie den ärztlichen Notdienst anrufen: Tel.: 069 19292 oder unseren Kollegen Dr. Meisner: Tel. 069 45 99 23.", "b": false}, {"t": "Ab dem 1. September sind wir wieder für Sie da. Beachten Sie unsere neuen Öffnungszeiten: Mo.–Fr. von 8–18 Uhr, Mittagspause: 13–14 Uhr, am Mittwoch schließen wir bereits um 13 Uhr.", "b": false}, {"t": "Notfallsprechstunde ab 1. September auch samstagvormittags von 9–12 Uhr.", "b": false}, {"t": "Ihr Praxisteam", "b": false}], "before": 3}], "maxPoints": 6, "availablePoints": 6, "missing": 0, "pointsPerItem": 1}'::jsonb, 7),
    ('lv1-09', 'Lesen', 'Übung 9', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Die ABC-Sprachschule wird 10 Jahre alt", "b": true}, {"t": "Liebe Kolleginnen und Kollegen,", "b": false}, {"t": "auch Sprachschulen haben Geburtstag! Deshalb möchte ich Sie gerne zu unserer „Geburtstagsfeier\" einladen.", "b": false}, {"t": "Das Fest – mit Essen aus vielen Ländern – ist am Donnerstag, dem 15. Mai, ab 19.00 Uhr im Gasthof „Zur Linde\". Ein Bus holt Sie um 17.30 Uhr vor dem Eingang unserer Schule ab und bringt Sie auch wieder zurück.", "b": false}, {"t": "Ich freue mich auf Ihr Kommen!", "b": false}, {"t": "Ihre Kerstin Steinborn", "b": false}], "before": 0}, {"paragraphs": [{"t": "Liebe Claudia", "b": true}, {"t": "Liebe Claudia,", "b": false}, {"t": "herzlichen Dank für deine Einladung. Ich habe mich wirklich sehr darüber gefreut.", "b": false}, {"t": "Leider kann ich aber am Wochenende nicht kommen. Meine Schwester muss ab Mittwoch ins Krankenhaus und ich muss mich um ihre Kinder kümmern.", "b": false}, {"t": "Schade! Vielleicht das nächste Mal.", "b": false}, {"t": "Liebe Grüße", "b": false}, {"t": "Deine Lisa", "b": false}], "before": 3}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 8),
    ('lv1-10', 'Lesen', 'Übung 10', 0, 'Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.', 'truefalse', '{"passages": [{"paragraphs": [{"t": "Im Hausflur", "b": true}, {"t": "Sehr geehrte Mieter,", "b": false}, {"t": "am Freitag, dem 02.04., kommt die Firma Elektro Schneider und baut im Keller und Treppenhaus neue Lampen ein. Wir möchten Sie darüber informieren, dass es dann in der Zeit von 8 bis 11 Uhr und von 13 bis 15.30 Uhr im ganzen Haus keinen Strom gibt.", "b": false}, {"t": "Mit freundlichen Grüßen", "b": false}, {"t": "Ihre Hausverwaltung", "b": false}], "before": 0}, {"paragraphs": [{"t": "Am Eingang des Einwohnermeldeamts", "b": true}, {"t": "Das Einwohnermeldeamt macht am Montag, dem 19. Oktober, eine Mitarbeiterversammlung. Aus diesem Grund bleibt das Amt an diesem Tag nachmittags geschlossen. Wir bitten um Ihr Verständnis.", "b": false}, {"t": "Ab Dienstag, dem 20. Oktober, stehen wir Ihnen wieder den ganzen Tag zur Verfügung.", "b": false}], "before": 2}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 1}'::jsonb, 9),
    ('s1', 'Schreiben', 'Schreiben, Teil 1 (Formular)', 10, 'Ihre Freundin Eva Kadavy macht mit ihrem Mann und ihren beiden Söhnen (8 und 11 Jahre alt) Urlaub in Seeheim. Im Reisebüro bucht sie für den nächsten Sonntag eine Busfahrt um den Bodensee. Frau Kadavy hat keine Kreditkarte. Helfen Sie Ihrer Freundin und schreiben Sie die fünf fehlenden Informationen in das Formular.', 'writing', '{"bankTitle": "Formular", "bankImage": "img/goethe-a1-m01-s1.jpg", "passages": [{"paragraphs": [{"t": "Bodensee-Rundfahrt Anmeldung", "b": true}, {"t": "Ihre Freundin Eva Kadavy macht mit ihrem Mann und ihren beiden Söhnen (8 und 11 Jahre alt) Urlaub in Seeheim. Im Reisebüro bucht sie für den nächsten Sonntag eine Busfahrt um den Bodensee. Frau Kadavy hat keine Kreditkarte.", "b": false}, {"t": "Helfen Sie Ihrer Freundin und schreiben Sie die fünf fehlenden Informationen in das Formular.", "b": false}], "before": 0}], "maxPoints": 5, "availablePoints": 5, "missing": 0, "pointsPerItem": 5}'::jsonb, 10),
    ('s2', 'Schreiben', 'Schreiben, Teil 2', 10, 'Schreiben Sie an Ihren Nachbarn, Herrn Maier, und bitten Sie um Hilfe. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).', 'writing', '{"passages": [{"paragraphs": [{"t": "Schreibaufgabe", "b": true}, {"t": "Sie bekommen am Dienstag einen neuen Kühlschrank. Sie müssen arbeiten. Schreiben Sie an Ihren Nachbarn, Herrn Maier, und bitten Sie um Hilfe.", "b": false}, {"t": "Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter):", "b": false}, {"t": "• Warum schreiben Sie?", "b": false}, {"t": "• Uhrzeit?", "b": false}, {"t": "• Schlüssel?", "b": false}], "before": 0}], "maxPoints": 10, "availablePoints": 10, "missing": 0, "pointsPerItem": 10}'::jsonb, 11)
) as v(section_id, grp, title, minutes, instruction, format, config, sort)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
on conflict (test_id, section_id) do update set "group" = excluded."group", title = excluded.title, minutes = excluded.minutes, instruction = excluded.instruction, format = excluded.format, config = excluded.config, sort = excluded.sort;

insert into items (section_id, item_id, text, options, points, meta, sort)
select s.id, v.item_id, v.text, v.options, v.points, v.meta, v.sort
from (values
    ('lv1-01', '1', 'Herr Beck übernachtet im Hotel.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-01', '2', 'Herr Beck bietet Frau Dehner seine Hilfe an.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-01', '3', 'Frau Stein ist in Berlin.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-01', '4', 'Am Mittwoch hat Frau Stein frei.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-01', '5', 'Frau Stein will am Freitag Dr. Falk treffen.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-02', '1', 'Lis Zug kommt nach halb eins an.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-02', '2', 'Karin wartet den ganzen Vormittag vor der Auskunft.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-02', '3', 'Ralf hatte am letzten Wochenende Geburtstag.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-02', '4', 'Ralf hat nur zwei oder drei Leute eingeladen.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-02', '5', 'Die Party findet draußen statt.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-03', '1', 'Renate macht in Weimar Urlaub.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-03', '2', 'Sie möchte am Abend mit Nora zusammen essen.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-03', '3', 'Die Sportsfreunde machen jeden Sommer einen Ausflug.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-03', '4', 'Der Bus wartet vor dem Vereinshaus.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-03', '5', 'Für die Fahrt und das Essen bezahlt jeder 10 Euro.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-04', '1', 'Matthias will am Samstag mit seinen Freunden zusammen sein.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-04', '2', 'Christian soll Matthias anrufen.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-04', '3', 'Michaela hat ein Zimmer in Frau Müllers Wohnung.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-04', '4', 'Michaela ist zurzeit in England.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-04', '5', 'Die Schwester will im Juli bei Michaela wohnen.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-05', '1', 'Roberto will Jasmin noch anrufen.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-05', '2', 'Roberto kommt am Abend nach Berlin.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-05', '3', 'Karin und Tom wohnen jetzt im Sandweg.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-05', '4', 'Sie kennen die Nachbarn noch nicht.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-05', '5', 'Die Gäste sollen Musik mitbringen.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-06', '1', 'Das Kind von Frau Schmidt ist krank.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-06', '2', 'Frau Schmidt möchte die Hausaufgaben wissen.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-06', '3', 'Fabian sucht Informationen über Urlaub an der Nordsee.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-06', '4', 'Robert und Fabian waren noch nie an der Nordsee.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-06', '5', 'Fabian möchte Robert in Hamburg treffen.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-07', '1', 'Maria übernachtet im Hotel.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-07', '2', 'Maria hat Besuch aus Spanien.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-07', '3', 'Herr Bauer möchte Herrn Schmidt besuchen.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-07', '4', 'Herr Bauer hat am 18. März abends Zeit.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-07', '5', 'Herr Bauer hat am 19. März keine Termine.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-08', '1', 'Herr Bauer ist krank.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-08', '2', 'Er hat am Donnerstag Urlaub.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-08', '3', 'Er war schon beim Arzt.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-08', '4', 'Die Praxis ist geschlossen.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-08', '5', 'Dr. Scholl hat eine neue Telefonnummer.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-08', '6', 'Im September können Sie jeden Nachmittag zu Dr. Scholl gehen.', null::jsonb, 1, null::jsonb, 5),
    ('lv1-09', '1', 'Die Feier ist in der Sprachschule.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-09', '2', 'Die Feier ist am Wochenende.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-09', '3', 'Man muss mit dem Auto zum Fest fahren.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-09', '4', 'Lisa geht schon am Mittwoch zu Claudia.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-09', '5', 'Lisas Schwester ist krank.', null::jsonb, 1, null::jsonb, 4),
    ('lv1-10', '1', 'Die Firma prüft alle Lampen im Haus.', null::jsonb, 1, null::jsonb, 0),
    ('lv1-10', '2', 'Die Mieter können um 14 Uhr den Elektroherd nicht benutzen.', null::jsonb, 1, null::jsonb, 1),
    ('lv1-10', '3', 'Das Einwohnermeldeamt ist am 19. Oktober den ganzen Tag geschlossen.', null::jsonb, 1, null::jsonb, 2),
    ('lv1-10', '4', 'Die Mitarbeiter arbeiten an diesem Montag nur vormittags.', null::jsonb, 1, null::jsonb, 3),
    ('lv1-10', '5', 'Am Dienstag ist das Einwohnermeldeamt geöffnet.', null::jsonb, 1, null::jsonb, 4),
    ('s1', '16', 'Schreiben Sie die fünf fehlenden Informationen in das Formular (Aufgaben 16–20):', null::jsonb, 0, '{"points": ["(1) Anzahl der Personen: 4", "(2) Davon Kinder: 2", "(3) PLZ, Urlaubsort: Seeheim", "(4) Zahlungsweise (Bar oder Kreditkarte): Bar", "(5) Reisetermin: Sonntag"]}'::jsonb, 0),
    ('s2', '21', 'Schreiben Sie eine E-Mail oder einen kurzen Brief an Herrn Maier:', null::jsonb, 0, '{"minWords": 30, "points": ["Warum schreiben Sie?", "Uhrzeit?", "Schlüssel?"]}'::jsonb, 0)
) as v(section_id, item_id, text, options, points, meta, sort)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
join sections s on s.test_id = t.id and s.section_id = v.section_id
on conflict (section_id, item_id) do update set text = excluded.text, options = excluded.options, points = excluded.points, meta = excluded.meta, sort = excluded.sort;

insert into item_answers (item_id, answer, explanation)
select i.id, v.answer, v.explanation
from (values
    ('lv1-01', '1', 'f', null),
    ('lv1-01', '2', 'r', null),
    ('lv1-01', '3', 'r', null),
    ('lv1-01', '4', 'f', null),
    ('lv1-01', '5', 'r', null),
    ('lv1-02', '1', 'r', null),
    ('lv1-02', '2', 'f', null),
    ('lv1-02', '3', 'f', null),
    ('lv1-02', '4', 'f', null),
    ('lv1-02', '5', 'r', null),
    ('lv1-03', '1', 'f', null),
    ('lv1-03', '2', 'r', null),
    ('lv1-03', '3', 'r', null),
    ('lv1-03', '4', 'r', null),
    ('lv1-03', '5', 'f', null),
    ('lv1-04', '1', 'r', null),
    ('lv1-04', '2', 'r', null),
    ('lv1-04', '3', 'f', null),
    ('lv1-04', '4', 'r', null),
    ('lv1-04', '5', 'f', null),
    ('lv1-05', '1', 'f', null),
    ('lv1-05', '2', 'f', null),
    ('lv1-05', '3', 'r', null),
    ('lv1-05', '4', 'f', null),
    ('lv1-05', '5', 'r', null),
    ('lv1-06', '1', 'r', null),
    ('lv1-06', '2', 'r', null),
    ('lv1-06', '3', 'r', null),
    ('lv1-06', '4', 'f', null),
    ('lv1-06', '5', 'f', null),
    ('lv1-07', '1', 'f', null),
    ('lv1-07', '2', 'r', null),
    ('lv1-07', '3', 'r', null),
    ('lv1-07', '4', 'r', null),
    ('lv1-07', '5', 'r', null),
    ('lv1-08', '1', 'r', null),
    ('lv1-08', '2', 'f', null),
    ('lv1-08', '3', 'f', null),
    ('lv1-08', '4', 'r', null),
    ('lv1-08', '5', 'f', null),
    ('lv1-08', '6', 'f', null),
    ('lv1-09', '1', 'f', null),
    ('lv1-09', '2', 'f', null),
    ('lv1-09', '3', 'f', null),
    ('lv1-09', '4', 'f', null),
    ('lv1-09', '5', 'r', null),
    ('lv1-10', '1', 'f', null),
    ('lv1-10', '2', 'r', null),
    ('lv1-10', '3', 'f', null),
    ('lv1-10', '4', 'f', null),
    ('lv1-10', '5', 'r', null)
) as v(section_id, item_id, answer, explanation)
join tests t on t.level_id = 'goethe-a1' and t.slug = 'modell-01'
join sections s on s.test_id = t.id and s.section_id = v.section_id
join items i on i.section_id = s.id and i.item_id = v.item_id
on conflict (item_id) do update set answer = excluded.answer, explanation = excluded.explanation;

commit;
