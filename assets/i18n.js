/* ترجمة الواجهة: ألماني (الأصل)، عربي، أوكراني.

   ★ الواجهة فقط. نصوص الامتحان — الأسئلة، النصوص، تعليمات telc — بتضل
     ألمانية. ترجمتها بتلغي الامتحان: قراءة التعليمة الألمانية جزء من
     الاختبار، وتغييرها بيخلّي التدرّب مو مطابق لليوم الحقيقي.

   الجمع: كل لغة إلها قواعدها (الألماني شكلين، الأوكراني تلاتة، العربي
   ستة). Intl.PluralRules هي يلي بتقرّر، وكل مدخلة بتعطي أشكالها. */
'use strict';

const I18N = (() => {

  /* العلم بيتعرف من بعيد وبلا قراءة — وهاد المطلوب من منتقي لغة: مين
     ما بيقرا الألماني لازم يلاقي لغته بلا ما يقرا شي. */
  /* ★ أعلام مرسومة SVG بدل إيموجي الأعلام: ويندوز ما بيعرض إيموجي العلم
     (بيطلع رمز البلد DE/SA/UA)، فمنرسمها تا تبان على كل الأجهزة. */
  const FLAGS = {
    de: '<svg class="flagimg" viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="3" fill="#000"/><rect y="1" width="5" height="1" fill="#D00"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>',
    ar: '<svg class="flagimg" viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="3" fill="#1a7a3c"/><rect x="0.7" y="1.95" width="3.6" height="0.2" rx="0.1" fill="#fff"/><rect x="1.2" y="1.15" width="2.6" height="0.5" rx="0.25" fill="#fff" opacity=".92"/></svg>',
    uk: '<svg class="flagimg" viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="3" fill="#FFD500"/><rect width="5" height="1.5" fill="#0057B7"/></svg>'
  };
  const LANGS = [
    { id: 'de', name: 'Deutsch',    flag: FLAGS.de, dir: 'ltr' },
    { id: 'ar', name: 'العربية',    flag: FLAGS.ar, dir: 'rtl' },
    { id: 'uk', name: 'Українська', flag: FLAGS.uk, dir: 'ltr' }
  ];

  const DICT = {
    de: {
      back: 'Zurück',
      loading: 'Lädt …',
      moment: 'Einen Moment …',
      preparing: 'Wird vorbereitet …',
      noServer: 'Keine Verbindung zum Server.',
      tryLater: 'Bitte später noch einmal versuchen.',
      notConfigured: 'Die App ist noch nicht mit dem Server verbunden.',
      fillConfig: 'assets/config.js ausfüllen.',

      codeTitle: 'Zugang',
      addCode: 'Ich habe einen weiteren Code',
      codeHint: 'Geben Sie Ihren Zugangscode ein. Sie haben ihn beim Kauf ' +
                'erhalten. Der Code wird nur einmal gebraucht — danach bleibt ' +
                'dieses Gerät angemeldet.',
      codeButton: 'Freischalten',
      codeChecking: 'Wird geprüft …',
      codeExample: 'Beispiel: B14827519366',
      codeErrTooMany: 'Zu viele Versuche. Bitte in {t} noch einmal probieren.',
      codeErrUnknown: 'Dieser Code ist unbekannt. Bitte die Ziffern noch einmal prüfen.',
      codeErrUsed: 'Dieser Code wurde bereits verwendet.',
      codeErrRevoked: 'Dieser Code wurde gesperrt.',
      codeErrExhausted: 'Dieser Code ist vollständig aufgebraucht – alle Aktivierungen wurden verwendet. '
                      + 'Bitte wenden Sie sich an Ihren Kurs.',
      codeErrDevices: 'Die Höchstzahl an Geräten ist erreicht.',
      codeErrNetwork: 'Keine Verbindung. Bitte später versuchen.',
      codeErrOther: 'Der Code konnte nicht eingelöst werden.',
      codeAlreadyFull: 'Sie haben für diese Stufe bereits vollen Zugang — dieser Code ist nicht nötig.',

      waitTitle: 'Sie stehen auf der Warteliste',
      waitPos: 'Platz {n}',
      nWaiting: { one: '{n} Person wartet', other: '{n} Personen warten' },
      waitHint: 'Ihr Code bleibt gültig — er wurde nicht verbraucht. '
              + 'Sobald ein Platz frei wird, können Sie ihn einlösen. '
              + 'Schauen Sie später noch einmal vorbei.',
      waitCheck: 'Ist ein Platz frei?',
      waitStill: 'Noch nicht — bitte später noch einmal.',
      waitOpen: 'Ein Platz ist frei! Geben Sie jetzt Ihren Code ein.',

      writePlaceholder: 'Schreiben Sie hier Ihren Brief …',
      checksTitle: 'Schnellprüfung',
      chkWords: '{n} von mindestens {min} Wörtern',
      chkGreeting: 'Anrede am Anfang',
      chkClosing: 'Gruß am Ende',
      chkPointsHint: 'Haken Sie ab, was Sie schon geschrieben haben:',

      aiErrQuota:   'Das Korrektur-Kontingent für diesen Zeitraum ist aufgebraucht.',
      aiErrDaily:   'Heute wurden schon sehr viele Korrekturen angefordert. '
                  + 'Bitte morgen noch einmal versuchen.',
      aiErrNoSub:   'Kein aktives Abo.',
      itemBroken:   'Zu dieser Aufgabe fehlen die Antwortmöglichkeiten.',
      aiErrEmpty:   'Es ist kein Text zum Korrigieren da.',
      aiErrShort:   'Der Text ist zu kurz für eine Korrektur.',
      aiErrSetup:   'Die Korrektur ist noch nicht eingerichtet.',
      aiErrRefused: 'Der Text konnte nicht bewertet werden.',
      aiErrNetwork: 'Keine Verbindung.',
      aiErrOther:   'Die Korrektur ist fehlgeschlagen.',

      welcome: 'Willkommen 👋',
      landingTitle: 'Deine Kurse 👋',
      landingSub: 'Wähle einen Kurs, um loszulegen.',
      statStreak: 'Tage-Serie',
      statSolved: 'gelöst',
      statMastered: 'gemeistert',
      continueTitle: 'Weitermachen',
      hideCard: 'Ausblenden',
      hideCardAsk: 'Diesen Kurs von der Startseite ausblenden? Mit dem Code kannst du ihn wieder hinzufügen.',
      homeIntro: 'Wählen Sie einen Modelltest. Jeder Test hat die Prüfungsteile ' +
                 'der schriftlichen Prüfung {level} — mit der echten Prüfungszeit.',
      homeIntroPlain: 'Wählen Sie einen Modelltest. Jeder Test hat die ' +
                      'Prüfungsteile der schriftlichen Prüfung — mit der echten Prüfungszeit.',
      /* Üben nach Abschnitt (Goethe) */
      praxisHome: 'Freies Üben ohne Zeit und Noten — oder unten die Prüfungssimulation.',
      praxisPick: 'Wählen Sie einen Teil.',
      praxisHint: 'Ohne Zeit, ohne Punkte. Ihr Stand wird gespeichert. '
                + 'Nach jedem Text können Sie die Antworten anzeigen.',
      praxisDone: '{n} von {total} beantwortet',
      praxisSetsDone: '{n} von {total} erledigt',
      reveal: 'Antworten anzeigen',
      revealing: 'Lädt …',
      revealed: 'Antworten angezeigt ✓',
      revealFailed: 'Antworten konnten nicht geladen werden.',
      fSolution: 'Lösung',
      w2Save: '💾 Text speichern',
      w2Saved: 'Gespeichert ✓',
      w2Photo: '📷 Lösung als Foto',
      w2Remove: 'Foto entfernen',
      w2TooBig: 'Das Foto ist zu groß zum Speichern. Bitte ein kleineres wählen.',
      w2Muster: '📄 Musterlösung anzeigen',
      w2MusterHide: '📄 Musterlösung ausblenden',
      wordsLabel: 'Wörter',
      minWords: 'mind. {min}',
      spCardsHint: 'Tippen Sie auf eine Karte — Sie sehen ein Beispiel. Sprechen Sie frei über sich.',
      spQuizTitle: 'Zufällige Prüferfrage',
      spTapDice: 'Tippen Sie auf den Würfel für eine Frage.',
      spNewQ: 'Neue Frage',
      spShowA: 'Beispielantwort zeigen',
      spHideA: 'Antwort ausblenden',
      spKartenHint: 'Ziehen Sie eine Karte. Bilden Sie zum Stichwort eine Frage — Ihr Partner antwortet. Danach können Sie ein Beispiel ansehen.',
      spBittenHint: 'Ziehen Sie eine Karte. Formulieren Sie zur Situation eine höfliche Bitte — Ihr Partner reagiert. Danach können Sie ein Beispiel ansehen.',
      spKartenAll: 'Alle Themen',
      spDraw: 'Karte ziehen',
      spTapCard: 'Tippen Sie auf „Karte ziehen“.',
      spShowQ: 'Beispiel zeigen',
      spHideQ: 'Beispiel ausblenden',
      spThema: 'Thema',
      w2MusterTitle: 'Musterlösung',
      praxisReset: 'Antworten zurücksetzen',
      praxisResetAsk: 'Alle Antworten in diesem Teil löschen und neu üben?',
      praxisResetDone: 'Zurückgesetzt — Sie können neu üben.',
      nPart: { one: '{n} Teil', other: '{n} Teile' },
      nUebung: { one: '{n} Übung', other: '{n} Übungen' },

      /* Fehler-Sammlung & Lesezeichen (Goethe) */
      mistCardTitle: 'Meine Fehler',
      mistCardHint: 'Übungen mit mindestens einem Fehler. Lösen Sie sie richtig, verschwinden sie hier.',
      mistCardEmpty: 'Keine Fehler — gut gemacht!',
      markCardTitle: 'Lesezeichen',
      markCardHint: 'Von Ihnen markierte Übungen. Tippen zum Öffnen.',
      markCardEmpty: 'Noch keine Lesezeichen. Tippen Sie in einer Übung auf den Stern.',
      bookmark: 'Lesezeichen',
      bookmarkAdded: 'Zu Lesezeichen hinzugefügt ✓',
      bookmarkRemoved: 'Lesezeichen entfernt',
      bookmarkRemove: 'Lesezeichen entfernen',

      material: 'Lesematerial',
      materialMeta: 'Wortschatz und Hinweise · jederzeit',
      materialEmpty: 'Für diese Prüfung ist noch nichts hinterlegt.',
      repeat: 'Wiederholen',
      due: '{n} fällig',
      nothingDue: 'Nichts fällig',
      sitting: '{n} sitzen schon',
      noTime: 'ohne Zeit',

      fullAccess: 'Voller Zugang',
      demo: 'Demo',
      until: 'bis {date}',
      daysLeft: { one: 'noch {n} Tag', other: 'noch {n} Tage' },
      hoursLeft: { one: 'noch {n} Stunde', other: 'noch {n} Stunden' },
      lessThanHour: 'weniger als 1 Stunde',
      expired: 'abgelaufen',
      upsell: '{n} in dieser Prüfung enthalten. Mit dem vollen Zugang stehen ' +
              'alle offen — mit Korrektur und Lösungen.',

      overview: 'Übersicht',
      start: 'Start ▶',
      resume: 'Weiter',
      pause: 'Pause',
      finish: 'Beenden',
      submit: 'Abgeben & korrigieren',
      restart: 'Neu beginnen',
      timeUp: 'Die Zeit ist abgelaufen ⏱',
      timerPaused: 'Der Timer steht. Sie können die App schließen und später ' +
                   'weitermachen.',
      loadFailed: 'Der Modelltest konnte nicht geladen werden.',
      levelFailed: 'Die Prüfung konnte nicht geladen werden.',
      savedOffline: 'Ihre Antworten sind gespeichert — bitte mit Verbindung ' +
                    'erneut abgeben.',

      audioPlay: '▶ Hörtext abspielen',
      audioAgain: '▶ Noch einmal',
      audioDone: '▶ Abgespielt',
      audioLoading: 'Hörtext wird geladen …',
      audioFailed: 'Der Hörtext konnte nicht geladen werden.',
      audioLeft: { one: 'noch {n}× abspielbar', other: 'noch {n}× abspielbar' },
      audioNone: 'keine Wiedergabe mehr',
      audioPause: '⏸ Pause',
      audioResume: '▶ Weiter',
      audioRunning: '⏸ Läuft …',
      audioFail: 'Wiedergabe nicht möglich',
      correct: "Richtig",
      simStart: "Prüfung simulieren",
      simDesc: "Zufällige Aufgaben · Hören, Lesen, Schreiben · mit Zeit",
      simStepOf: "Schritt {n} von {total}",
      simPrev: "← Zurück",
      simNext: "Weiter →",
      simFinish: "Prüfung abschließen",
      simNextAsk: "Zu {next} weitergehen? Zurück ist möglich, solange noch Zeit übrig ist.",
      simFinishAsk: "Prüfung abschließen und Ergebnis anzeigen?",
      simRightOf: "{right} von {total} richtig",
      simReview: "Auswertung",
      simAgain: "Neue Prüfung",
      yourText: "Ihr Text",
      noText: "(kein Text geschrieben)",
      simPaused: "Pausiert",
      simResume: "Fortsetzen",
      delLast: 'Letzte Prüfung löschen?',
      del: 'Löschen',
      gradeVeryGood: "sehr gut",
      gradeGood: "gut",
      gradeSatis: "befriedigend",
      gradeSuffic: "ausreichend",
      gradeFail: "nicht bestanden",
      noAnswer: "keine Antwort",
      pointsWord: "Punkte",
      inTemplate: "in der Vorlage",
      lastExam: "Letzte Prüfung",
      notRated: "noch nicht bewertet",
      nowDone: "jetzt ✓",
      adsFailed: "Die Anzeigen konnten nicht geladen werden.",
      drillTitle: "Fehler wiederholen",
      correcting: "Wird korrigiert … (bis zu 1 Minute)",
      requestCorrection: "Korrektur anfordern",
      allRepeated: 'Alles wiederholt',
      nextOn: 'weiter am {date}',
      transcript: 'Hörtext',

      imgLoading: 'Anzeigen werden geladen …',
      imgTap: 'Zum Vergrößern auf das Bild tippen',

      yourAnswer: 'Ihre Antwort',
      choose: '— bitte wählen —',
      solution: 'Lösung',
      wrong: '✘ Falsch · 0 P.',
      wrongShort: 'Falsch',
      errorDetail: 'Fehler im Einzelnen',
      noSolutions: 'Für diese Prüfung liegen keine Lösungen vor.',
      noMistakes: 'Keine Fehler gespeichert.',
      empty: 'Leer.',
      view: 'Ansehen',
      remove: 'Löschen',
      tasks: 'Aufgaben',
      time: 'Zeit',
      better: 'Besser',

      yourText: 'Ihr Text',
      rateSelf: 'Bewerten Sie jedes Kriterium selbst — so wie in der Prüfung bewertet wird.',
      grading: 'Bewertung',
      aiIntro: 'Ihr Brief wird gelesen und nach den Kriterien Ihrer Prüfung ' +
               'bewertet — mit Hinweisen zu jedem Fehler.',
      aiRequest: 'Korrektur anfordern',
      aiWorking: 'Wird korrigiert …',
      aiView: 'Korrigierte Fassung ansehen',
      aiOffline: 'Ohne Verbindung ist keine Korrektur möglich.',
      aiFailed: 'Die Korrektur ist fehlgeschlagen.',
      correction: 'Korrektur',

      /* ---- Problem melden ---- */
      reportBtn: 'Problem melden',
      reportTitle: 'Helfen Sie uns',
      reportIntro: 'Liebe Nutzerin, lieber Nutzer: helfen Sie uns, die App '
                 + 'besser zu machen — oder sagen Sie uns Ihren Wunsch. '
                 + 'Stimmt etwas nicht bei „{exam}"?',
      reportPlaceholder: 'Schreiben Sie hier, was nicht stimmt …',
      reportMin: 'Bitte mindestens {n} Zeichen',
      reportSend: 'Senden',
      reportSending: 'Wird gesendet …',
      reportThanks: 'Danke! Ihre Meldung ist angekommen.',
      reportTooShort: 'Bitte schreiben Sie etwas mehr.',
      reportTooMany: 'Sie haben gerade mehrere Meldungen geschickt. '
                   + 'Bitte versuchen Sie es in einer Stunde noch einmal.',
      reportFailed: 'Die Meldung konnte nicht gesendet werden.',

      yes: 'Ja',
      no: 'Abbrechen',
      leave: 'Verlassen',
      leaveAsk: 'Prüfung verlassen? Ihre Antworten gehen verloren.',
      words: { one: '{n} Wort', other: '{n} Wörter' },
      minWords: '— mindestens {n} verlangt',
      passFrom: 'bestanden ab {p} Punkten (60 %)',

      again: 'Wiederholen',
      taskHead: 'Aufgabe',

      settings: 'Einstellungen',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      smaller: 'Kleiner',
      bigger: 'Größer',
      progress: '{done} von {total} beantwortet',
      openAsk: '{n} ohne Antwort. Trotzdem abgeben?',
      submitAnyway: 'Trotzdem abgeben',
      keepGoing: 'Weiter bearbeiten',
      nOpen: { one: '{n} Aufgabe ist noch', other: '{n} Aufgaben sind noch' },

      nTask:    { one: '{n} Aufgabe',     other: '{n} Aufgaben' },
      nMinute:  { one: '{n} Minute',      other: '{n} Minuten' },
      nTest:    { one: '{n} Modelltest',  other: '{n} Modelltests' },
      nText:    { one: '{n} Text',        other: '{n} Texte' },
      nMissing: { one: '{n} Aufgabe fehlt', other: '{n} Aufgaben fehlen' },
      nSits:    { one: '{n} Aufgabe sitzt', other: '{n} Aufgaben sitzen' },
      nMore:    { one: '{n} weiterer Modelltest ist',
                  other: '{n} weitere Modelltests sind' }
    },

    ar: {
      back: 'رجوع',
      loading: 'جاري التحميل …',
      moment: 'لحظة …',
      preparing: 'جاري التحضير …',
      noServer: 'ما في اتصال بالخادم.',
      tryLater: 'جرّب مرة تانية بعد شوي.',
      notConfigured: 'التطبيق لسا مو مربوط بالخادم.',
      fillConfig: 'عبّي assets/config.js.',

      codeTitle: 'الدخول',
      addCode: 'عندي كود تاني',
      codeHint: 'أدخل رمز الدخول. أخذته عند الشراء. الرمز بينستعمل مرة ' +
                'وحدة — وبعدها بيضل هالجهاز مسجّل.',
      codeButton: 'تفعيل',
      codeChecking: 'عم نفحص …',
      codeExample: 'مثال: B14827519366',
      codeErrTooMany: 'محاولات كتير. جرّب بعد {t}.',
      codeErrUnknown: 'هالرمز مو معروف. راجع الأرقام مرة تانية.',
      codeErrUsed: 'هالرمز مستعمل من قبل.',
      codeErrRevoked: 'هالرمز متوقّف.',
      codeErrExhausted: 'هالرمز استُهلك بالكامل — كل التفعيلات انستعملت. '
                      + 'احكي مع الدورة تبعك.',
      codeErrDevices: 'وصلت لأقصى عدد أجهزة.',
      codeErrNetwork: 'ما في اتصال. جرّب بعد شوي.',
      codeErrOther: 'ما قدرنا نفعّل الرمز.',
      codeAlreadyFull: 'عندك وصول كامل أصلاً لهالمستوى — ما بتحتاج هالرمز.',

      waitTitle: 'إنت بقائمة الانتظار',
      waitPos: 'دورك رقم {n}',
      nWaiting: { zero: 'ما في حدا مستني', one: 'في واحد مستني',
                  two: 'في اتنين مستنيين', few: '{n} مستنيين',
                  many: '{n} مستني', other: '{n} مستني' },
      waitHint: 'رمزك باقي ساري — ما انستهلك. أول ما يفضى مطرح بتقدر '
              + 'تفعّله. مرّ علينا بعدين.',
      waitCheck: 'في مطرح فاضي؟',
      waitStill: 'لسا — جرّب بعد شوي.',
      waitOpen: 'صار في مطرح! أدخل رمزك هلق.',

      writePlaceholder: 'اكتب رسالتك هون …',
      checksTitle: 'فحص سريع',
      chkWords: '{n} من {min} كلمة على الأقل',
      chkGreeting: 'في تحية بالبداية',
      chkClosing: 'في سلام بالنهاية',
      chkPointsHint: 'شطّب على يلي كتبته:',

      aiErrQuota:   'حصّة التصحيح لهالفترة خلصت.',
      aiErrDaily:   'اليوم انطلبت تصحيحات كتير. جرّب بكرا.',
      aiErrNoSub:   'ما في اشتراك فعّال.',
      itemBroken:   'هالسؤال ناقصه الخيارات.',
      aiErrEmpty:   'ما في نص لنصحّحه.',
      aiErrShort:   'النص قصير كتير عالتصحيح.',
      aiErrSetup:   'التصحيح لسا مو مجهّز.',
      aiErrRefused: 'ما قدرنا نقيّم هالنص.',
      aiErrNetwork: 'ما في اتصال.',
      aiErrOther:   'التصحيح ما نجح.',

      welcome: 'أهلاً 👋',
      landingTitle: 'دوراتك 👋',
      landingSub: 'اختر دورة لتبدأ.',
      statStreak: 'سلسلة أيام',
      statSolved: 'محلول',
      statMastered: 'متقَن',
      continueTitle: 'تابع من وين وقفت',
      hideCard: 'إخفاء',
      hideCardAsk: 'إخفاء هذا الكورس من الصفحة الرئيسية؟ تقدر ترجّعه بإدخال الكود من جديد.',
      homeIntro: 'اختر نموذج امتحان. كل نموذج فيه أقسام الامتحان التحريري ' +
                 '{level} — بوقت الامتحان الحقيقي.',
      homeIntroPlain: 'اختر نموذج امتحان. كل نموذج فيه أقسام الامتحان ' +
                      'التحريري — بوقت الامتحان الحقيقي.',
      material: 'مواد للقراءة',
      materialMeta: 'مفردات وملاحظات · بأي وقت',
      materialEmpty: 'لهالامتحان لسا ما في مواد.',
      repeat: 'مراجعة',
      due: '{n} مستحقّة',
      nothingDue: 'ما في شي مستحقّ',
      sitting: '{n} صارت راسخة',
      noTime: 'بلا وقت',

      fullAccess: 'وصول كامل',
      demo: 'تجريبي',
      until: 'لتاريخ {date}',
      daysLeft: { zero: 'ما بقي يوم', one: 'باقي يوم', two: 'باقي يومين',
                  few: 'باقي {n} أيام', many: 'باقي {n} يوم',
                  other: 'باقي {n} يوم' },
      hoursLeft: { zero: 'ما بقيت ساعة', one: 'باقي ساعة', two: 'باقي ساعتين',
                   few: 'باقي {n} ساعات', many: 'باقي {n} ساعة',
                   other: 'باقي {n} ساعة' },
      lessThanHour: 'أقل من ساعة',
      expired: 'انتهى',
      upsell: '{n} بهالامتحان. مع الوصول الكامل بتنفتح كلها — مع التصحيح ' +
              'والحلول.',

      overview: 'نظرة عامة',
      start: 'ابدأ ▶',
      resume: 'متابعة',
      pause: 'إيقاف مؤقّت',
      finish: 'إنهاء',
      submit: 'تسليم وتصحيح',
      restart: 'ابدأ من جديد',
      timeUp: 'انتهى الوقت ⏱',
      timerPaused: 'المؤقّت واقف. فيك تسكّر التطبيق وتكمّل بعدين.',
      loadFailed: 'ما قدرنا نحمّل النموذج.',
      levelFailed: 'ما قدرنا نحمّل الامتحان.',
      savedOffline: 'إجاباتك محفوظة — سلّمها لما يرجع الاتصال.',

      audioPlay: '▶ شغّل التسجيل',
      audioAgain: '▶ مرة تانية',
      audioDone: '▶ انتهى التشغيل',
      audioLoading: 'جاري تحميل التسجيل …',
      audioFailed: 'ما قدرنا نحمّل التسجيل.',
      audioLeft: { zero: 'ما بقي تشغيل', one: 'باقي تشغيل واحد',
                   two: 'باقي تشغيلين', few: 'باقي {n} تشغيلات',
                   many: 'باقي {n} تشغيل', other: 'باقي {n} تشغيل' },
      audioNone: 'ما بقي تشغيل',
      audioPause: '⏸ إيقاف مؤقت',
      audioResume: '▶ متابعة',
      audioRunning: '⏸ قيد التشغيل …',
      audioFail: 'تعذّر التشغيل',
      correct: "صحيح",
      simStart: "امتحان تجريبي",
      simDesc: "أقسام عشوائية · استماع، قراءة، كتابة · بوقت",
      simStepOf: "المرحلة {n} من {total}",
      simPrev: "→ رجوع",
      simNext: "التالي →",
      simFinish: "إنهاء الامتحان",
      simNextAsk: "الانتقال إلى {next}؟ تقدر ترجع ما دام في وقت باقي.",
      simFinishAsk: "إنهاء الامتحان وعرض النتيجة؟",
      simRightOf: "{right} من {total} صحيحة",
      simReview: "التصحيح",
      simAgain: "امتحان جديد",
      yourText: "نصّك",
      noText: "(لم تكتب نصًّا)",
      simPaused: "متوقّف مؤقتاً",
      simResume: "متابعة",
      delLast: 'حذف آخر محاولة؟',
      del: 'حذف',
      gradeVeryGood: "ممتاز",
      gradeGood: "جيد",
      gradeSatis: "مقبول",
      gradeSuffic: "كافٍ",
      gradeFail: "لم يجتز",
      noAnswer: "بلا إجابة",
      pointsWord: "نقطة",
      inTemplate: "في النموذج",
      lastExam: "آخر محاولة",
      notRated: "لم يُقيَّم بعد",
      nowDone: "الآن ✓",
      adsFailed: "تعذّر تحميل الإعلانات.",
      drillTitle: "مراجعة الأخطاء",
      correcting: "جارٍ التصحيح … (حتى دقيقة)",
      requestCorrection: "طلب التصحيح",
      allRepeated: 'تمّت مراجعة الكل',
      nextOn: 'التالي في {date}',
      praxisHome: "تدرّب بحرّية بلا وقت ولا درجات — أو جرّب الامتحان التجريبي تحت.",
      praxisPick: "اختر جزءًا.",
      praxisHint: "بلا وقت وبلا نقاط. يُحفظ تقدّمك. بعد كل نص يمكنك عرض الإجابات.",
      praxisDone: "{n} من {total} مُجابة",
      praxisSetsDone: "{n} من {total} مكتمل",
      reveal: "عرض الإجابات",
      revealing: "جارٍ التحميل …",
      revealed: "تم عرض الإجابات ✓",
      revealFailed: "تعذّر تحميل الإجابات.",
      fSolution: "الحل",
      w2Save: "💾 حفظ النص",
      w2Saved: "تم الحفظ ✓",
      w2Photo: "📷 الحل كصورة",
      w2Remove: "إزالة الصورة",
      w2TooBig: "الصورة كبيرة جدًا على الحفظ. يُرجى اختيار صورة أصغر.",
      w2Muster: "📄 عرض الحل النموذجي",
      w2MusterHide: "📄 إخفاء الحل النموذجي",
      wordsLabel: "كلمات",
      spCardsHint: "اضغط على بطاقة — سترى مثالاً. تحدّث بحرّية عن نفسك.",
      spQuizTitle: "سؤال عشوائي من الممتحن",
      spTapDice: "اضغط على النرد للحصول على سؤال.",
      spNewQ: "سؤال جديد",
      spShowA: "عرض إجابة نموذجية",
      spHideA: "إخفاء الإجابة",
      spKartenHint: "اسحب بطاقة. كوّن سؤالاً حول الكلمة المفتاحية — يجيب شريكك. بعدها يمكنك مشاهدة مثال.",
      spBittenHint: "اسحب بطاقة. صُغ طلبًا مهذبًا للموقف — يتجاوب شريكك. بعدها يمكنك مشاهدة مثال.",
      spKartenAll: "كل المواضيع",
      spDraw: "اسحب بطاقة",
      spTapCard: "اضغط على «اسحب بطاقة».",
      spShowQ: "عرض مثال",
      spHideQ: "إخفاء المثال",
      spThema: "الموضوع",
      w2MusterTitle: "الحل النموذجي",
      praxisReset: "إعادة ضبط الإجابات",
      praxisResetAsk: "حذف كل الإجابات في هذا الجزء والتدرّب من جديد؟",
      praxisResetDone: "تمت إعادة الضبط — يمكنك التدرّب من جديد.",
      nPart: {"zero":"{n} جزء","one":"جزء واحد","two":"جزءان","few":"{n} أجزاء","many":"{n} جزءًا","other":"{n} جزء"},
      nUebung: {"zero":"ولا تمرين","one":"تمرين واحد","two":"تمرينان","few":"{n} تمارين","many":"{n} تمريناً","other":"{n} تمرين"},

      /* الأخطاء والإشارات المرجعية (Goethe) */
      mistCardTitle: 'أخطائي',
      mistCardHint: 'التمارين التي فيها خطأ واحد على الأقل. إذا حللتها صح تختفي من هنا.',
      mistCardEmpty: 'ما في أخطاء — أحسنت!',
      markCardTitle: 'إشارات مرجعية',
      markCardHint: 'التمارين التي علّمتها. اضغط لفتحها.',
      markCardEmpty: 'لا إشارات مرجعية بعد. اضغط على النجمة داخل أي تمرين.',
      bookmark: 'إشارة مرجعية',
      bookmarkAdded: 'أُضيفت إلى الإشارات ✓',
      bookmarkRemoved: 'أُزيلت الإشارة',
      bookmarkRemove: 'إزالة الإشارة',

      transcript: 'نص التسجيل',

      imgLoading: 'جاري تحميل الإعلانات …',
      imgTap: 'اضغط على الصورة لتكبيرها',

      yourAnswer: 'إجابتك',
      choose: '— اختر —',
      solution: 'الحل',
      wrong: '✘ خطأ · ٠ نقطة',
      wrongShort: 'خطأ',
      errorDetail: 'تفصيل الأخطاء',
      noSolutions: 'لهالامتحان ما في حلول.',
      noMistakes: 'ما في أخطاء محفوظة.',
      empty: 'فاضي.',
      view: 'عرض',
      remove: 'حذف',
      tasks: 'الأسئلة',
      time: 'الوقت',
      better: 'أفضل',

      yourText: 'نصّك',
      rateSelf: 'قيّم كل معيار بنفسك — متل ما بيقيّم الامتحان.',
      grading: 'التقييم',
      aiIntro: 'رسالتك رح تنقرا وتتقيّم حسب معايير امتحانك — مع ملاحظة ' +
               'على كل خطأ.',
      aiRequest: 'اطلب التصحيح',
      aiWorking: 'جاري التصحيح …',
      aiView: 'شوف النسخة المصحّحة',
      aiOffline: 'بلا اتصال ما في تصحيح.',
      aiFailed: 'فشل التصحيح.',
      correction: 'التصحيح',

      /* ---- بلّغ عن مشكلة ---- */
      reportBtn: 'بلّغ عن مشكلة',
      reportTitle: 'ساعدنا',
      reportIntro: 'عزيزي المستخدم، ساعدنا نحسّن التطبيق — أو قلّنا شو بتتمنّى. '
                 + 'في شي غلط بـ«{exam}»؟',
      reportPlaceholder: 'اكتب هون شو المشكلة …',
      reportMin: 'اكتب {n} حروف على الأقل',
      reportSend: 'إرسال',
      reportSending: 'عم ينبعت …',
      reportThanks: 'شكراً! وصلنا تبليغك.',
      reportTooShort: 'اكتب شوي كمان لو سمحت.',
      reportTooMany: 'بعتت كذا تبليغ هلق. جرّب بعد ساعة لو سمحت.',
      reportFailed: 'ما انبعت التبليغ.',

      yes: 'نعم',
      no: 'إلغاء',
      leave: 'خروج',
      leaveAsk: 'تطلع من الامتحان؟ إجاباتك بتضيع.',
      words: { zero: 'ولا كلمة', one: 'كلمة', two: 'كلمتين',
               few: '{n} كلمات', many: '{n} كلمة', other: '{n} كلمة' },
      minWords: '— المطلوب {n} على الأقل',
      passFrom: 'النجاح من {p} نقطة (٦٠٪)',

      again: 'إعادة',
      taskHead: 'السؤال',

      settings: 'الإعدادات',
      themeLight: 'فاتح',
      themeDark: 'غامق',
      smaller: 'أصغر',
      bigger: 'أكبر',
      progress: 'انحلّ {done} من {total}',
      openAsk: '{n} بلا إجابة. تسلّم برضو؟',
      submitAnyway: 'سلّم برضو',
      keepGoing: 'كمّل الحلّ',
      nOpen: { zero: 'ما في سؤال', one: 'في سؤال', two: 'في سؤالين',
               few: 'في {n} أسئلة', many: 'في {n} سؤال', other: 'في {n} سؤال' },

      nTask:    { zero: 'ولا سؤال', one: 'سؤال واحد', two: 'سؤالين',
                  few: '{n} أسئلة', many: '{n} سؤال', other: '{n} سؤال' },
      nMinute:  { zero: 'ولا دقيقة', one: 'دقيقة', two: 'دقيقتين',
                  few: '{n} دقائق', many: '{n} دقيقة', other: '{n} دقيقة' },
      nTest:    { zero: 'ولا نموذج', one: 'نموذج واحد', two: 'نموذجين',
                  few: '{n} نماذج', many: '{n} نموذج', other: '{n} نموذج' },
      nText:    { zero: 'ولا نص', one: 'نص واحد', two: 'نصّين',
                  few: '{n} نصوص', many: '{n} نص', other: '{n} نص' },
      nMissing: { zero: 'ما في ناقص', one: 'سؤال ناقص', two: 'سؤالين ناقصين',
                  few: '{n} أسئلة ناقصة', many: '{n} سؤال ناقص',
                  other: '{n} سؤال ناقص' },
      nSits:    { zero: 'ولا سؤال راسخ', one: 'سؤال راسخ', two: 'سؤالين راسخين',
                  few: '{n} أسئلة راسخة', many: '{n} سؤال راسخ',
                  other: '{n} سؤال راسخ' },
      nMore:    { zero: 'ما في نماذج تانية', one: 'في نموذج تاني',
                  two: 'في نموذجين تانيين', few: 'في {n} نماذج تانية',
                  many: 'في {n} نموذج تاني', other: 'في {n} نموذج تاني' }
    },

    uk: {
      back: 'Назад',
      loading: 'Завантаження …',
      moment: 'Хвилинку …',
      preparing: 'Підготовка …',
      noServer: 'Немає зв’язку із сервером.',
      tryLater: 'Спробуйте пізніше.',
      notConfigured: 'Застосунок ще не підключено до сервера.',
      fillConfig: 'Заповніть assets/config.js.',

      codeTitle: 'Доступ',
      addCode: 'У мене є ще один код',
      codeHint: 'Введіть код доступу. Ви отримали його під час покупки. ' +
                'Код потрібен лише один раз — далі пристрій залишається ' +
                'підключеним.',
      codeButton: 'Активувати',
      codeChecking: 'Перевіряємо …',
      codeExample: 'Приклад: B14827519366',
      codeErrTooMany: 'Забагато спроб. Спробуйте через {t}.',
      codeErrUnknown: 'Такий код невідомий. Перевірте цифри ще раз.',
      codeErrUsed: 'Цей код уже використано.',
      codeErrRevoked: 'Цей код заблоковано.',
      codeErrExhausted: 'Цей код повністю використано — усі активації вичерпано. '
                      + 'Зверніться до свого курсу.',
      codeErrDevices: 'Досягнуто максимальну кількість пристроїв.',
      codeErrNetwork: 'Немає зв’язку. Спробуйте пізніше.',
      codeErrOther: 'Код не вдалося активувати.',
      codeAlreadyFull: 'У вас уже є повний доступ до цього рівня — цей код не потрібен.',

      waitTitle: 'Ви у списку очікування',
      waitPos: 'Місце {n}',
      nWaiting: { one: '{n} людина чекає', few: '{n} людини чекають',
                  many: '{n} людей чекають', other: '{n} людей чекають' },
      waitHint: 'Ваш код залишається дійсним — його не використано. '
              + 'Щойно звільниться місце, ви зможете його активувати. '
              + 'Зазирніть пізніше.',
      waitCheck: 'Є вільне місце?',
      waitStill: 'Ще ні — спробуйте пізніше.',
      waitOpen: 'Місце звільнилося! Введіть свій код зараз.',

      writePlaceholder: 'Напишіть свій лист тут …',
      checksTitle: 'Швидка перевірка',
      chkWords: '{n} із щонайменше {min} слів',
      chkGreeting: 'Звертання на початку',
      chkClosing: 'Прощання наприкінці',
      chkPointsHint: 'Позначте те, що вже написали:',

      aiErrQuota:   'Ліміт перевірок на цей період вичерпано.',
      aiErrDaily:   'Сьогодні вже було багато запитів на перевірку. '
                  + 'Спробуйте завтра.',
      aiErrNoSub:   'Немає активної підписки.',
      itemBroken:   'У цього завдання немає варіантів відповіді.',
      aiErrEmpty:   'Немає тексту для перевірки.',
      aiErrShort:   'Текст закороткий для перевірки.',
      aiErrSetup:   'Перевірку ще не налаштовано.',
      aiErrRefused: 'Не вдалося оцінити цей текст.',
      aiErrNetwork: 'Немає зв’язку.',
      aiErrOther:   'Перевірка не вдалася.',

      welcome: 'Вітаємо 👋',
      landingTitle: 'Твої курси 👋',
      landingSub: 'Обери курс, щоб почати.',
      statStreak: 'Серія днів',
      statSolved: 'виконано',
      statMastered: 'засвоєно',
      continueTitle: 'Продовжити',
      hideCard: 'Сховати',
      hideCardAsk: 'Сховати цей курс з головної? Його можна повернути, ввівши код.',
      homeIntro: 'Оберіть пробний тест. Кожен тест містить частини письмового ' +
                 'іспиту {level} — зі справжнім часом.',
      homeIntroPlain: 'Оберіть пробний тест. Кожен тест містить частини ' +
                      'письмового іспиту — зі справжнім часом.',
      material: 'Матеріали для читання',
      materialMeta: 'Лексика та поради · будь-коли',
      materialEmpty: 'Для цього іспиту ще нічого немає.',
      repeat: 'Повторення',
      due: '{n} до повторення',
      nothingDue: 'Нічого не потрібно',
      sitting: '{n} вже засвоєно',
      noTime: 'без часу',

      fullAccess: 'Повний доступ',
      demo: 'Демо',
      until: 'до {date}',
      daysLeft: { one: 'ще {n} день', few: 'ще {n} дні',
                  many: 'ще {n} днів', other: 'ще {n} дня' },
      hoursLeft: { one: 'ще {n} година', few: 'ще {n} години',
                   many: 'ще {n} годин', other: 'ще {n} години' },
      lessThanHour: 'менше ніж година',
      expired: 'термін вичерпано',
      upsell: '{n} у цьому іспиті. З повним доступом відкриті всі — з ' +
              'перевіркою та відповідями.',

      overview: 'Огляд',
      start: 'Почати ▶',
      resume: 'Далі',
      pause: 'Пауза',
      finish: 'Завершити',
      submit: 'Здати й перевірити',
      restart: 'Почати заново',
      timeUp: 'Час вичерпано ⏱',
      timerPaused: 'Таймер зупинено. Можна закрити застосунок і продовжити ' +
                   'пізніше.',
      loadFailed: 'Не вдалося завантажити тест.',
      levelFailed: 'Не вдалося завантажити іспит.',
      savedOffline: 'Ваші відповіді збережено — здайте їх, коли буде зв’язок.',

      audioPlay: '▶ Відтворити аудіо',
      audioAgain: '▶ Ще раз',
      audioDone: '▶ Відтворено',
      audioLoading: 'Аудіо завантажується …',
      audioFailed: 'Не вдалося завантажити аудіо.',
      audioLeft: { one: 'ще {n} відтворення', few: 'ще {n} відтворення',
                   many: 'ще {n} відтворень', other: 'ще {n} відтворення' },
      audioNone: 'відтворень не залишилось',
      audioPause: '⏸ Пауза',
      audioResume: '▶ Далі',
      audioRunning: '⏸ Відтворення …',
      audioFail: 'Відтворення неможливе',
      correct: "Правильно",
      simStart: "Пробний іспит",
      simDesc: "Випадкові завдання · Слухання, Читання, Письмо · із часом",
      simStepOf: "Крок {n} з {total}",
      simPrev: "← Назад",
      simNext: "Далі →",
      simFinish: "Завершити іспит",
      simNextAsk: "Перейти до {next}? Повернутися можна, поки є час.",
      simFinishAsk: "Завершити іспит і показати результат?",
      simRightOf: "{right} з {total} правильно",
      simReview: "Розбір",
      simAgain: "Новий іспит",
      yourText: "Ваш текст",
      noText: "(текст не написано)",
      simPaused: "Призупинено",
      simResume: "Продовжити",
      delLast: 'Видалити останній іспит?',
      del: 'Видалити',
      gradeVeryGood: "відмінно",
      gradeGood: "добре",
      gradeSatis: "задовільно",
      gradeSuffic: "достатньо",
      gradeFail: "не складено",
      noAnswer: "немає відповіді",
      pointsWord: "балів",
      inTemplate: "у шаблоні",
      lastExam: "Останній іспит",
      notRated: "ще не оцінено",
      nowDone: "тепер ✓",
      adsFailed: "Не вдалося завантажити оголошення.",
      drillTitle: "Повторити помилки",
      correcting: "Перевіряється … (до 1 хвилини)",
      requestCorrection: "Запросити перевірку",
      allRepeated: 'Усе повторено',
      nextOn: 'далі {date}',
      praxisHome: "Вільне тренування без часу й оцінок — або внизу пробний іспит.",
      praxisPick: "Виберіть частину.",
      praxisHint: "Без часу й без балів. Ваш прогрес зберігається. Після кожного тексту можна показати відповіді.",
      praxisDone: "Відповіли на {n} з {total}",
      praxisSetsDone: "{n} з {total} виконано",
      reveal: "Показати відповіді",
      revealing: "Завантаження …",
      revealed: "Відповіді показано ✓",
      revealFailed: "Не вдалося завантажити відповіді.",
      fSolution: "Розв'язання",
      w2Save: "💾 Зберегти текст",
      w2Saved: "Збережено ✓",
      w2Photo: "📷 Відповідь як фото",
      w2Remove: "Видалити фото",
      w2TooBig: "Фото завелике для збереження. Виберіть менше.",
      w2Muster: "📄 Показати зразок розв'язання",
      w2MusterHide: "📄 Сховати зразок розв'язання",
      wordsLabel: "Слова",
      spCardsHint: "Торкніться картки — побачите приклад. Розкажіть вільно про себе.",
      spQuizTitle: "Випадкове питання екзаменатора",
      spTapDice: "Торкніться кубика, щоб отримати питання.",
      spNewQ: "Нове питання",
      spShowA: "Показати приклад відповіді",
      spHideA: "Сховати відповідь",
      spKartenHint: "Витягніть картку. Складіть питання до ключового слова — партнер відповість. Потім можна переглянути приклад.",
      spBittenHint: "Витягніть картку. Сформулюйте до ситуації ввічливе прохання — партнер відреагує. Потім можна переглянути приклад.",
      spKartenAll: "Усі теми",
      spDraw: "Витягнути картку",
      spTapCard: "Торкніться «Витягнути картку».",
      spShowQ: "Показати приклад",
      spHideQ: "Сховати приклад",
      spThema: "Тема",
      w2MusterTitle: "Зразок розв'язання",
      praxisReset: "Скинути відповіді",
      praxisResetAsk: "Видалити всі відповіді в цій частині й тренуватися заново?",
      praxisResetDone: "Скинуто — можна тренуватися заново.",
      nPart: {"one":"{n} частина","few":"{n} частини","many":"{n} частин","other":"{n} частини"},
      nUebung: {"one":"{n} вправа","few":"{n} вправи","many":"{n} вправ","other":"{n} вправи"},

      /* Помилки та закладки (Goethe) */
      mistCardTitle: 'Мої помилки',
      mistCardHint: 'Вправи щонайменше з однією помилкою. Розв’яжіть правильно — вони зникнуть звідси.',
      mistCardEmpty: 'Помилок немає — чудово!',
      markCardTitle: 'Закладки',
      markCardHint: 'Позначені вами вправи. Торкніться, щоб відкрити.',
      markCardEmpty: 'Поки немає закладок. Торкніться зірки у вправі.',
      bookmark: 'Закладка',
      bookmarkAdded: 'Додано до закладок ✓',
      bookmarkRemoved: 'Закладку вилучено',
      bookmarkRemove: 'Вилучити закладку',

      transcript: 'Текст аудіо',

      imgLoading: 'Оголошення завантажуються …',
      imgTap: 'Торкніться зображення, щоб збільшити',

      yourAnswer: 'Ваша відповідь',
      choose: '— оберіть —',
      solution: 'Відповідь',
      wrong: '✘ Неправильно · 0 б.',
      wrongShort: 'Неправильно',
      errorDetail: 'Помилки докладно',
      noSolutions: 'Для цього іспиту немає відповідей.',
      noMistakes: 'Помилок не збережено.',
      empty: 'Порожньо.',
      view: 'Переглянути',
      remove: 'Видалити',
      tasks: 'Завдання',
      time: 'Час',
      better: 'Краще',

      yourText: 'Ваш текст',
      rateSelf: 'Оцініть кожен критерій самі — так само, як оцінюють на іспиті.',
      grading: 'Оцінювання',
      aiIntro: 'Ваш лист буде прочитано й оцінено за критеріями вашого ' +
               'іспиту — з поясненням кожної помилки.',
      aiRequest: 'Запросити перевірку',
      aiWorking: 'Перевіряємо …',
      aiView: 'Переглянути виправлений варіант',
      aiOffline: 'Без зв’язку перевірка неможлива.',
      aiFailed: 'Перевірка не вдалася.',
      correction: 'Перевірка',

      /* ---- Повідомити про проблему ---- */
      reportBtn: 'Повідомити про проблему',
      reportTitle: 'Допоможіть нам',
      reportIntro: 'Шановний користувачу, допоможіть нам покращити застосунок — '
                 + 'або напишіть своє побажання. Щось не так у «{exam}»?',
      reportPlaceholder: 'Напишіть тут, що не так …',
      reportMin: 'Щонайменше {n} символів',
      reportSend: 'Надіслати',
      reportSending: 'Надсилається …',
      reportThanks: 'Дякуємо! Ваше повідомлення надійшло.',
      reportTooShort: 'Напишіть, будь ласка, трохи більше.',
      reportTooMany: 'Ви щойно надіслали кілька повідомлень. '
                   + 'Спробуйте, будь ласка, за годину.',
      reportFailed: 'Не вдалося надіслати повідомлення.',

      yes: 'Так',
      no: 'Скасувати',
      leave: 'Вийти',
      leaveAsk: 'Вийти з іспиту? Ваші відповіді буде втрачено.',
      words: { one: '{n} слово', few: '{n} слова',
               many: '{n} слів', other: '{n} слова' },
      minWords: '— щонайменше {n}',
      passFrom: 'склав від {p} балів (60 %)',

      again: 'Повторити',
      taskHead: 'Завдання',

      settings: 'Налаштування',
      themeLight: 'Світлий',
      themeDark: 'Темний',
      smaller: 'Менше',
      bigger: 'Більше',
      progress: '{done} з {total} виконано',
      openAsk: '{n} без відповіді. Усе одно здати?',
      submitAnyway: 'Усе одно здати',
      keepGoing: 'Продовжити',
      nOpen: { one: '{n} завдання', few: '{n} завдання',
               many: '{n} завдань', other: '{n} завдання' },

      nTask:    { one: '{n} завдання', few: '{n} завдання',
                  many: '{n} завдань', other: '{n} завдання' },
      nMinute:  { one: '{n} хвилина', few: '{n} хвилини',
                  many: '{n} хвилин', other: '{n} хвилини' },
      nTest:    { one: '{n} тест', few: '{n} тести',
                  many: '{n} тестів', other: '{n} тесту' },
      nText:    { one: '{n} текст', few: '{n} тексти',
                  many: '{n} текстів', other: '{n} тексту' },
      nMissing: { one: '{n} завдання бракує', few: '{n} завдання бракує',
                  many: '{n} завдань бракує', other: '{n} завдання бракує' },
      nSits:    { one: '{n} завдання засвоєно', few: '{n} завдання засвоєно',
                  many: '{n} завдань засвоєно', other: '{n} завдання засвоєно' },
      nMore:    { one: 'Ще {n} тест є', few: 'Ще {n} тести є',
                  many: 'Ще {n} тестів є', other: 'Ще {n} тесту є' }
    }
  };

  const KEY = 'b1.lang';
  let lang = 'de';

  /* ★ Übersetzungen der Aufgaben-Anweisungen (Goethe A1) nach de→{ar,uk}.
     Nur eine Lernhilfe; der deutsche Text bleibt immer sichtbar. */
  const INSTR_TR = /*__INSTR_TR__*/ {"Lesen Sie die beiden Texte und die Aufgaben 1 bis 5. Kreuzen Sie an: Richtig oder Falsch.":{"ar":"اقرأ النصّين والأسئلة من 1 إلى 5. ثمّ ضع علامة: صحيح أم خطأ.","uk":"Прочитайте обидва тексти та завдання з 1 до 5. Позначте: правильно чи неправильно."},"Lesen Sie die beiden Texte und die Aufgaben 1 bis 6. Kreuzen Sie an: Richtig oder Falsch.":{"ar":"اقرأ النصّين والأسئلة من 1 إلى 6. ثمّ ضع علامة: صحيح أم خطأ.","uk":"Прочитайте обидва тексти та завдання з 1 до 6. Позначте: правильно чи неправильно."},"Lesen Sie die Texte und die Aufgaben 6 bis 10. Wo finden Sie Informationen? Kreuzen Sie an: a oder b.":{"ar":"اقرأ النصوص والأسئلة من 6 إلى 10. أين تجد المعلومات؟ ضع علامة: a أم b.","uk":"Прочитайте тексти та завдання з 6 до 10. Де ви знайдете інформацію? Позначте: a чи b."},"Lesen Sie die Texte und die Aufgaben 6 bis 10. Welche Anzeige ist interessant für Sie? Markieren Sie a oder b.":{"ar":"اقرأ النصوص والأسئلة من 6 إلى 10. أيّ إعلان يهمّك؟ حدّد: a أم b.","uk":"Прочитайте тексти та завдання з 6 до 10. Яке оголошення цікаве для вас? Позначте a чи b."},"Lesen Sie die Texte und die Aufgaben 6 bis 10. Welche Anzeige passt? Markieren Sie a oder b.":{"ar":"اقرأ النصوص والأسئلة من 6 إلى 10. أيّ إعلان يناسب؟ حدّد: a أم b.","uk":"Прочитайте тексти та завдання з 6 до 10. Яке оголошення підходить? Позначте a чи b."},"Lesen Sie die Texte und die Aufgaben 1 bis 8. Welche Internet-Adresse ist richtig? Kreuzen Sie an: a oder b.":{"ar":"اقرأ النصوص والأسئلة من 1 إلى 8. أيّ عنوان إنترنت هو الصحيح؟ ضع علامة: a أم b.","uk":"Прочитайте тексти та завдання з 1 до 8. Яка інтернет-адреса правильна? Позначте: a чи b."},"Lesen Sie die Texte und die Aufgaben. Welche Anzeige passt? Kreuzen Sie an: a oder b.":{"ar":"اقرأ النصوص والأسئلة. أيّ إعلان يناسب؟ ضع علامة: a أم b.","uk":"Прочитайте тексти та завдання. Яке оголошення підходить? Позначте: a чи b."},"Lesen Sie die Texte und die Aufgaben. Kreuzen Sie an: Richtig oder Falsch.":{"ar":"اقرأ النصوص والأسئلة. ضع علامة: صحيح أم خطأ.","uk":"Прочитайте тексти та завдання. Позначте: правильно чи неправильно."},"Lesen Sie den Text und ergänzen Sie die fünf fehlenden Informationen (1–5) im Formular.":{"ar":"اقرأ النصّ وأكمل المعلومات الخمس الناقصة (1–5) في الاستمارة.","uk":"Прочитайте текст і впишіть п'ять відсутніх даних (1–5) у формуляр."},"Sie bekommen am Dienstag einen neuen Kühlschrank. Sie müssen arbeiten. Schreiben Sie an Ihren Nachbarn Herrn Maier und bitten Sie um Hilfe. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"ستصلك ثلّاجة جديدة يوم الثلاثاء، لكن عليك أن تذهب إلى العمل. اكتب رسالة إلى جارك السيّد Maier واطلب منه المساعدة. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"У вівторок вам привезуть новий холодильник, але ви маєте бути на роботі. Напишіть вашому сусідові панові Maier і попросіть про допомогу. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie suchen eine Arbeit als Verkäufer/Verkäuferin und lesen in der Zeitung eine Anzeige. Antworten Sie an den Supermarkt „cent\". Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تبحث عن عمل كبائع/بائعة وقرأت إعلانًا في الجريدة. ردّ على السوبر ماركت „cent\". اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви шукаєте роботу продавця/продавчині й прочитали оголошення в газеті. Напишіть відповідь супермаркету „cent\". Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihre Freundin Nina möchte sich am Samstag mit Ihnen treffen, aber Sie können nicht. Schreiben Sie an Nina. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"صديقتك Nina تريد أن تلتقي بك يوم السبت، لكنّك لا تستطيع. اكتب رسالة إلى Nina. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ваша подруга Nina хоче зустрітися з вами в суботу, але ви не можете. Напишіть Nina. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten umziehen und suchen eine neue Wohnung. Sie haben eine Anzeige gelesen. Schreiben Sie an den Vermieter Herrn Mawat. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد الانتقال وتبحث عن شقّة جديدة. قرأت إعلانًا. اكتب رسالة إلى المالك السيّد Mawat. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете переїхати й шукаєте нове житло. Ви прочитали оголошення. Напишіть орендодавцю панові Mawat. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie haben bald Geburtstag und möchten am Freitag feiern. Sie möchten Ihre Freunde Linda und Martin aus dem Sprachkurs einladen. Schreiben Sie an Linda und Martin. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"عيد ميلادك قريب وتريد الاحتفال به يوم الجمعة. تريد دعوة صديقيك Linda وMartin من دورة اللغة. اكتب رسالة إلى Linda وMartin. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Скоро ваш день народження, і ви хочете святкувати в п'ятницю. Ви хочете запросити своїх друзів Linda і Martin з мовного курсу. Напишіть Linda і Martin. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Der Deutschkurs ist zu Ende. Sie machen eine Party und laden Ihre Lehrerin Frau Schmitz ein. Schreiben Sie an Frau Schmitz. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"انتهت دورة اللغة الألمانية. أنت تقيم حفلة وتدعو معلّمتك السيّدة Schmitz. اكتب رسالة إلى السيّدة Schmitz. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Курс німецької мови закінчився. Ви влаштовуєте вечірку й запрошуєте свою вчительку пані Schmitz. Напишіть пані Schmitz. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie besuchen einen Deutschkurs und können nächsten Montag nicht zum Deutschkurs kommen. Schreiben Sie an Ihre Lehrerin Frau Schmidt. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"أنت تحضر دورة لغة ألمانية ولا تستطيع الحضور يوم الاثنين القادم. اكتب رسالة إلى معلّمتك السيّدة Schmidt. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви відвідуєте курс німецької мови й не можете прийти на заняття наступного понеділка. Напишіть вашій вчительці пані Schmidt. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie laden am Samstag 30 Personen zur Party ein und möchten im Restaurant essen. Schreiben Sie an das Restaurant „Laura“. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تدعو يوم السبت 30 شخصًا إلى حفلة وتريد تناول الطعام في المطعم. اكتب رسالة إلى مطعم „Laura“. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"У суботу ви запрошуєте 30 осіб на вечірку й хочете повечеряти в ресторані. Напишіть ресторанові „Laura“. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie fahren am nächsten Donnerstag nach Leipzig und brauchen ein Zimmer für eine Nacht. Schreiben Sie an das „Gästehaus Meier“. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"ستسافر يوم الخميس القادم إلى Leipzig وتحتاج إلى غرفة لليلة واحدة. اكتب رسالة إلى „Gästehaus Meier“. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Наступного четверга ви їдете до Leipzig і вам потрібна кімната на одну ніч. Напишіть у „Gästehaus Meier“. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie suchen einen Schrank und lesen eine Anzeige im Internet. Schreiben Sie an den Verkäufer Herrn Teppert. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تبحث عن خزانة وقرأت إعلانًا على الإنترنت. اكتب رسالة إلى البائع السيّد Teppert. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви шукаєте шафу й прочитали оголошення в інтернеті. Напишіть продавцю панові Teppert. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie haben Ihre Freundin Anna lange nicht gesehen und möchten mit ihr essen. Schreiben Sie an Anna. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"لم ترَ صديقتك Anna منذ فترة طويلة وتريد تناول الطعام معها. اكتب رسالة إلى Anna. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви давно не бачили свою подругу Anna й хочете з нею повечеряти. Напишіть Anna. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie suchen ein Sofa und lesen in der Zeitung eine Anzeige. Antworten Sie an den Verkäufer. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تبحث عن أريكة وقرأت إعلانًا في الجريدة. ردّ على البائع. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви шукаєте диван і прочитали оголошення в газеті. Напишіть відповідь продавцю. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten bei der Kochschule Schmidt einen Kochkurs besuchen. Schreiben Sie an die „Kochschule Schmidt“. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد حضور دورة طبخ في مدرسة الطبخ Schmidt. اكتب رسالة إلى „Kochschule Schmidt“. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете відвідати кулінарний курс у кулінарній школі Schmidt. Напишіть у „Kochschule Schmidt“. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihre Freundin Jasmin hat ein Baby bekommen. Sie möchten ihr gratulieren und sie zu Hause besuchen. Schreiben Sie an Jasmin. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"صديقتك Jasmin أنجبت طفلًا. تريد أن تهنّئها وأن تزورها في بيتها. اكتب رسالة إلى Jasmin. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"У вашої подруги Jasmin народилася дитина. Ви хочете привітати її та відвідати вдома. Напишіть Jasmin. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihr Freund Roland hat Sie zu seiner Hochzeit nach Bonn eingeladen. Schreiben Sie eine E-Mail an ihn. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"صديقك Roland دعاك إلى حفل زفافه في Bonn. اكتب له رسالة بريد إلكتروني. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ваш друг Roland запросив вас на своє весілля в Bonn. Напишіть йому електронного листа. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihre Freundin Lina möchte Sie besuchen, aber Sie sind nicht zu Hause. Schreiben Sie an Lina. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"صديقتك Lina تريد زيارتك، لكنّك لست في البيت. اكتب رسالة إلى Lina. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ваша подруга Lina хоче вас відвідати, але вас немає вдома. Напишіть Lina. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten am 15. August ein Familienfest mit hundert Personen feiern und brauchen einen großen Raum. Schreiben Sie an das Hotel „Kaiser Wilhelm“. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد إقامة حفل عائلي يوم 15 أغسطس بحضور مئة شخص وتحتاج إلى قاعة كبيرة. اكتب رسالة إلى فندق „Kaiser Wilhelm“. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"15 серпня ви хочете провести сімейне свято на сто осіб, і вам потрібне велике приміщення. Напишіть у готель „Kaiser Wilhelm“. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie ziehen in die Berliner Straße 11 und brauchen Hilfe von Ihrem Freund. Schreiben Sie an Ihren Freund. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"ستنتقل إلى Berliner Straße 11 وتحتاج إلى مساعدة صديقك. اكتب رسالة إلى صديقك. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви переїжджаєте на Berliner Straße 11 і вам потрібна допомога вашого друга. Напишіть вашому другові. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie suchen ein Auto und lesen im Internet eine Anzeige. Schreiben Sie an den Verkäufer. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تبحث عن سيّارة وقرأت إعلانًا على الإنترنت. اكتب رسالة إلى البائع. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви шукаєте автомобіль і прочитали оголошення в інтернеті. Напишіть продавцю. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten Ihren Geburtstag feiern und Ihre Freunde Susanna und Paul einladen. Schreiben Sie an Susanna und Paul. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد الاحتفال بعيد ميلادك ودعوة صديقيك Susanna وPaul. اكتب رسالة إلى Susanna وPaul. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете відсвяткувати свій день народження й запросити своїх друзів Susanna і Paul. Напишіть Susanna і Paul. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihr neuer Kollege Herr Jensch hat Sie am Dienstag um 15 Uhr zu seiner Geburtstagsfeier im Büro eingeladen. Schreiben Sie an Herrn Jensch. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"زميلك الجديد السيّد Jensch دعاك يوم الثلاثاء الساعة الثالثة بعد الظهر إلى حفلة عيد ميلاده في المكتب. اكتب رسالة إلى السيّد Jensch. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ваш новий колега пан Jensch запросив вас у вівторок о 15:00 на святкування свого дня народження в офісі. Напишіть панові Jensch. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten einen Computerkurs bei der Firma „Profil“ machen. Schreiben Sie an die Firma „Profil“. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد حضور دورة حاسوب لدى شركة „Profil“. اكتب رسالة إلى شركة „Profil“. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете пройти комп'ютерний курс у фірмі „Profil“. Напишіть фірмі „Profil“. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten mit Ihrem Freund Peter am Sonntag einen Ausflug mit dem Fahrrad machen. Schreiben Sie an Peter. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد القيام برحلة بالدرّاجة يوم الأحد مع صديقك Peter. اكتب رسالة إلى Peter. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете в неділю поїхати на велосипедну прогулянку зі своїм другом Peter. Напишіть Peter. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten im Sommer in München Urlaub machen. Schreiben Sie an die Touristeninformation. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد قضاء إجازتك في الصيف في München. اكتب رسالة إلى مكتب معلومات السيّاح. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете влітку провести відпустку в München. Напишіть у туристичне інформаційне бюро. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie sind krank und können nicht nach Frankfurt zu einem Termin mit Herrn Bauer kommen. Schreiben Sie an Herrn Bauer. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"أنت مريض ولا تستطيع الذهاب إلى Frankfurt لموعد مع السيّد Bauer. اكتب رسالة إلى السيّد Bauer. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви захворіли й не можете приїхати до Frankfurt на зустріч із паном Bauer. Напишіть панові Bauer. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten mit Ihrer Familie im Hotel Leonardo übernachten. Schreiben Sie an das Hotel. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد المبيت مع عائلتك في فندق Leonardo. اكتب رسالة إلى الفندق. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете переночувати зі своєю родиною в готелі Leonardo. Напишіть у готель. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Sie möchten im August Dresden besuchen. Schreiben Sie an die Touristeninformation. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"تريد زيارة Dresden في شهر أغسطس. اكتب رسالة إلى مكتب معلومات السيّاح. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ви хочете відвідати Dresden у серпні. Напишіть у туристичне інформаційне бюро. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Ihr Freund Jan hat Ihnen geschrieben: „Hallo, viele Grüße aus Sindelfingen! Ich bin in den Ferien bei meiner Oma, und ich finde es total langweilig. Hier kann man so wenig machen, und ich kenne auch niemanden. Was machst du denn so in den Ferien? Und wie geht es deiner Familie? Bitte schreib mir bald! Jan.“ Antworten Sie Jan. Schreiben Sie zu jedem Punkt ein bis zwei Sätze (ca. 30 Wörter).":{"ar":"كتب لك صديقك Jan: „مرحبًا، تحيّاتي من Sindelfingen! أنا أقضي العطلة عند جدّتي، وأجد الأمر مملًّا جدًّا. لا يوجد هنا الكثير لفعله، ولا أعرف أحدًا أيضًا. ماذا تفعل أنت في العطلة؟ وكيف حال عائلتك؟ أرجو أن تكتب لي قريبًا! Jan.“ ردّ على Jan. اكتب جملة إلى جملتين لكلّ نقطة (حوالي 30 كلمة).","uk":"Ваш друг Jan написав вам: „Привіт, вітання із Sindelfingen! Я на канікулах у бабусі, і мені страшенно нудно. Тут так мало чим можна зайнятися, і я тут нікого не знаю. А що ти робиш на канікулах? І як справи у твоєї родини? Будь ласка, напиши мені скоро! Jan.“ Напишіть відповідь Jan. Напишіть одне-два речення до кожного пункту (приблизно 30 слів)."},"Im Sprechen Teil 1 stellen Sie sich vor. Sprechen Sie über die Stichwörter. Danach stellt die Prüferin oder der Prüfer Ihnen ein bis zwei Fragen.":{"ar":"في الجزء الأوّل من المحادثة، عرّف عن نفسك. تحدّث عن الكلمات المفتاحية. بعد ذلك تطرح عليك الممتحِنة أو الممتحِن سؤالًا أو سؤالين.","uk":"У частині 1 усного мовлення ви представляєте себе. Розкажіть про ключові слова. Після цього екзаменаторка або екзаменатор поставить вам одне-два запитання."},"Im Sprechen Teil 2 bekommen Sie Karten mit einem Thema und einem Stichwort. Bilden Sie zum Stichwort eine Frage. Ihre Partnerin oder Ihr Partner antwortet.":{"ar":"في الجزء الثاني من المحادثة، تحصل على بطاقات تحمل موضوعًا وكلمة مفتاحية. كوّن سؤالًا حول الكلمة المفتاحية. وتجيب عنه شريكتك أو شريكك.","uk":"У частині 2 усного мовлення ви отримуєте картки з темою та ключовим словом. Складіть запитання до ключового слова. Ваша партнерка або партнер відповідає."},"Im Sprechen Teil 3 ziehen Sie eine Karte mit einer Situation. Formulieren Sie eine höfliche Bitte. Ihre Partnerin oder Ihr Partner reagiert darauf.":{"ar":"في الجزء الثالث من المحادثة، تسحب بطاقة تحمل موقفًا. صُغ طلبًا بأدب. وتتجاوب معه شريكتك أو شريكك.","uk":"У частині 3 усного мовлення ви витягуєте картку із ситуацією. Сформулюйте ввічливе прохання. Ваша партнерка або партнер реагує на нього."},"Sie hören sechs kurze Texte. Sie hören jeden Text zweimal. Wählen Sie bei jeder Aufgabe: a, b oder c.":{"ar":"ستستمع إلى ستّة نصوص قصيرة. تُسمع كلّ نصّ مرّتين. اختر في كلّ سؤال: a أم b أم c.","uk":"Ви почуєте шість коротких текстів. Кожен текст звучить двічі. У кожному завданні оберіть: a, b чи c."},"Sie hören vier kurze Texte. Sie hören jeden Text einmal. Wählen Sie: Richtig oder Falsch.":{"ar":"ستستمع إلى أربعة نصوص قصيرة. تُسمع كلّ نصّ مرّة واحدة. اختر: صحيح أم خطأ.","uk":"Ви почуєте чотири короткі тексти. Кожен текст звучить один раз. Оберіть: правильно чи неправильно."},"Sie hören fünf kurze Gespräche. Sie hören jedes Gespräch zweimal. Wählen Sie bei jeder Aufgabe: a, b oder c.":{"ar":"ستستمع إلى خمس محادثات قصيرة. تُسمع كلّ محادثة مرّتين. اختر في كلّ سؤال: a أم b أم c.","uk":"Ви почуєте п'ять коротких розмов. Кожна розмова звучить двічі. У кожному завданні оберіть: a, b чи c."}};

  /* لغة المتصفّح إذا منعرفها، وإلا ألماني. الاختيار اليدوي بيغلب. */
  function detect(){
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && DICT[saved]) return saved;
    } catch {}
    const nav = (navigator.languages || [navigator.language || ''])
      .map(x => String(x).slice(0, 2).toLowerCase());
    return nav.find(x => DICT[x]) || 'de';
  }

  function setLang(id){
    if (!DICT[id]) return;
    lang = id;
    try { localStorage.setItem(KEY, id); } catch {}
    apply();
  }

  function apply(){
    const d = LANGS.find(l => l.id === lang) || LANGS[0];
    document.documentElement.lang = lang;
    document.documentElement.dir  = d.dir;
  }

  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g,
    (_, k) => vars && vars[k] != null ? vars[k] : '');

  /* المفتاح الناقص بيرجع للألماني، وبعدها للمفتاح نفسه. هيك ترجمة
     ناقصة بتطلع بالألماني بدل ما تطلع فاضية. */
  function raw(key){
    const v = DICT[lang] && DICT[lang][key];
    if (v != null) return v;
    const de = DICT.de[key];
    return de != null ? de : key;
  }

  function t(key, vars){
    const v = raw(key);
    return typeof v === 'string' ? fill(v, vars) : key;
  }

  /* الجمع: Intl.PluralRules بتعطي الفئة حسب اللغة، والمدخلة بتعطي شكلها.
     الألماني شكلين، الأوكراني تلاتة، العربي ستة — فربط الشكل بالفئة
     أسلم من عدّ الأشكال بالإيد. */
  function plural(n, key){
    const v = raw(key);
    if (typeof v === 'string') return fill(v, { n });
    let cat = 'other';
    try { cat = new Intl.PluralRules(lang).select(n); } catch {}
    const form = v[cat] != null ? v[cat] : v.other;
    return fill(form, { n });
  }

  lang = detect();
  const trInstr = txt => { const e = INSTR_TR[txt]; return e ? (e[lang] || null) : null; };

  return { LANGS, t, plural, setLang, get lang(){ return lang; }, apply, trInstr,
           has: k => !!(DICT[lang] && DICT[lang][k]) };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
