/* ========================================
   Internationalization — English / Spanish
   ======================================== */

const STRINGS = {
  en: {
    // Home screen
    getStarted: 'Get Started',
    homeEvent: 'Showcase Atlanta \u00d7 FIFA World Cup 2026',
    homeDesc: 'Visit 16 iconic Atlanta neighborhoods, snap photos with custom frames, and compete to win prizes during the world\'s biggest sporting event.',
    stepScan: 'Scan',
    stepScanDesc: 'Find a flag and scan the QR code',
    stepCapture: 'Capture',
    stepCaptureDesc: 'Take a photo with a custom frame',
    stepWin: 'Win',
    stepWinDesc: 'Capture all 16 flags to claim prizes',
    chooseNeighborhood: 'Choose a neighborhood',

    // Landing screen
    captureThisFlag: 'Capture This Flag',
    welcomeTo: 'Welcome to',
    pairedWith: 'Paired with',

    // Format selection
    chooseFormat: 'Choose your format',
    portrait: 'Portrait',
    story: 'Story',
    square: 'Square',

    // Edit screen
    tapToUpload: 'Tap to upload photo',
    changePhoto: 'Change Photo',
    saveAndCheckin: 'Save & Check In',
    saving: 'Saving...',
    dragHint: 'Drag to position. Pinch to zoom.',
    back: 'Back',

    // Email capture
    almostThere: 'Almost there!',
    emailPrompt: 'Enter your info to download and track your progress.',
    firstName: 'First Name',
    emailAddress: 'Email Address',
    downloadMyPhoto: 'Download My Photo',
    skipForNow: 'Skip for now',

    // Done screen
    flagCaptured: 'Flag Captured!',
    checkedInAt: 'Checked in at',
    progressSoFar: 'of 16 flags captured',
    shareMessage: 'Share it with',
    captureAnother: 'Capture Another Flag',
    viewProgress: 'View My Progress',

    // Progress screen
    yourProgress: 'Your Progress',
    flagsCaptured: 'flags captured',
    of: 'of',
    keepExploring: 'Keep exploring Atlanta!',
    allCaptured: 'You captured them all!',
    leaderboard: 'Leaderboard',
    captureMore: 'Capture More Flags',

    // Leaderboard
    topExplorers: 'Top Explorers',
    locations: 'locations',

    // Footer
    footer: 'World Welcome to Atlanta',
    showcaseAtlanta: 'Showcase Atlanta',

    // Language toggle
    submitForReview: 'Submit for Review',

    // Knockout rounds
    knockoutFlag: 'KNOCKOUT FLAG',
    knockoutCaptured: 'Knockout Flag Captured!',
    knockoutChampion: 'Knockout Champion',
    knockoutRemaining: 'knockout flags remaining',
    knockoutFlags: 'knockout flags',
    phaseGroupStage: 'GROUP STAGE',
    phaseR32: 'KNOCKOUT: ROUND OF 32',
    phaseR16: 'KNOCKOUT: ROUND OF 16',
    phaseSemifinal: 'KNOCKOUT: SEMIFINAL',

    switchLang: 'Espa\u00f1ol',
  },

  es: {
    getStarted: 'Comenzar',
    homeEvent: 'Showcase Atlanta \u00d7 Copa Mundial FIFA 2026',
    homeDesc: 'Visita 16 vecindarios ic\u00f3nicos de Atlanta, toma fotos con marcos personalizados y compite por premios durante el evento deportivo m\u00e1s grande del mundo.',
    stepScan: 'Escanea',
    stepScanDesc: 'Encuentra una bandera y escanea el c\u00f3digo QR',
    stepCapture: 'Captura',
    stepCaptureDesc: 'Toma una foto con un marco personalizado',
    stepWin: 'Gana',
    stepWinDesc: 'Captura las 16 banderas para ganar premios',
    chooseNeighborhood: 'Elige un vecindario',

    captureThisFlag: 'Captura Esta Bandera',
    welcomeTo: 'Bienvenido a',
    pairedWith: 'Emparejado con',

    chooseFormat: 'Elige tu formato',
    portrait: 'Retrato',
    story: 'Historia',
    square: 'Cuadrado',

    tapToUpload: 'Toca para subir foto',
    changePhoto: 'Cambiar Foto',
    saveAndCheckin: 'Guardar y Registrar',
    saving: 'Guardando...',
    dragHint: 'Arrastra para posicionar. Pellizca para zoom.',
    back: 'Volver',

    almostThere: '\u00a1Casi listo!',
    emailPrompt: 'Ingresa tu info para descargar y seguir tu progreso.',
    firstName: 'Nombre',
    emailAddress: 'Correo Electr\u00f3nico',
    downloadMyPhoto: 'Descargar Mi Foto',
    skipForNow: 'Saltar por ahora',

    flagCaptured: '\u00a1Bandera Capturada!',
    checkedInAt: 'Registrado en',
    progressSoFar: 'de 16 banderas capturadas',
    shareMessage: 'Comp\u00e1rtela con',
    captureAnother: 'Captura Otra Bandera',
    viewProgress: 'Ver Mi Progreso',

    yourProgress: 'Tu Progreso',
    flagsCaptured: 'banderas capturadas',
    of: 'de',
    keepExploring: '\u00a1Sigue explorando Atlanta!',
    allCaptured: '\u00a1Las capturaste todas!',
    leaderboard: 'Tabla de L\u00edderes',
    captureMore: 'Captura M\u00e1s Banderas',

    topExplorers: 'Top Exploradores',
    locations: 'ubicaciones',

    footer: 'Bienvenido al Mundo de Atlanta',
    showcaseAtlanta: 'Showcase Atlanta',

    submitForReview: 'Enviar para Revisi\u00f3n',

    // Knockout rounds
    knockoutFlag: 'BANDERA ELIMINATORIA',
    knockoutCaptured: '\u00a1Bandera Eliminatoria Capturada!',
    knockoutChampion: 'Campe\u00f3n Eliminatorio',
    knockoutRemaining: 'banderas eliminatorias restantes',
    knockoutFlags: 'banderas eliminatorias',
    phaseGroupStage: 'FASE DE GRUPOS',
    phaseR32: 'ELIMINATORIA: RONDA DE 32',
    phaseR16: 'ELIMINATORIA: RONDA DE 16',
    phaseSemifinal: 'ELIMINATORIA: SEMIFINAL',

    switchLang: 'English',
  },
};

let currentLang = 'en';

/** Get a translated string */
export function t(key) {
  return STRINGS[currentLang]?.[key] || STRINGS.en[key] || key;
}

/** Toggle between English and Spanish */
export function toggleLang() {
  currentLang = currentLang === 'en' ? 'es' : 'en';
  return currentLang;
}

/** Get current language */
export function getLang() {
  return currentLang;
}
