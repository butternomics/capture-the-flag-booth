/* ========================================
   Internationalization — English / Spanish
   ======================================== */

const STRINGS = {
  en: {
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
    downloadPhoto: 'Download Photo',
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
    photoSaved: 'Photo Saved!',
    shareMessage: 'Share it with',
    iosHint: 'Long-press the image to save it to your camera roll.',
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
    switchLang: 'Espa\u00f1ol',
  },

  es: {
    captureThisFlag: 'Captura Esta Bandera',
    welcomeTo: 'Bienvenido a',
    pairedWith: 'Emparejado con',

    chooseFormat: 'Elige tu formato',
    portrait: 'Retrato',
    story: 'Historia',
    square: 'Cuadrado',

    tapToUpload: 'Toca para subir foto',
    changePhoto: 'Cambiar Foto',
    downloadPhoto: 'Descargar Foto',
    saving: 'Guardando...',
    dragHint: 'Arrastra para posicionar. Pellizca para zoom.',
    back: 'Volver',

    almostThere: '\u00a1Casi listo!',
    emailPrompt: 'Ingresa tu info para descargar y seguir tu progreso.',
    firstName: 'Nombre',
    emailAddress: 'Correo Electr\u00f3nico',
    downloadMyPhoto: 'Descargar Mi Foto',
    skipForNow: 'Saltar por ahora',

    photoSaved: '\u00a1Foto Guardada!',
    shareMessage: 'Comp\u00e1rtela con',
    iosHint: 'Mant\u00e9n presionada la imagen para guardarla.',
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
