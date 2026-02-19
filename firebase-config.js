/**
 * Configuración de Firebase para la web.
 * Obtén tu apiKey y appId desde Firebase Console > Tu proyecto > Configuración del proyecto > Tus apps > Añadir app > Web.
 * Si no añades la app web, el auth usará fallback en localStorage.
 */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCqYo-LQ2l-ETTRiNYx5U4tbnFVIEscbYw',
  authDomain: 'clinicos-aed47.firebaseapp.com',
  projectId: 'clinicos-aed47',
  storageBucket: 'clinicos-aed47.firebasestorage.app',
  messagingSenderId: '211175272499',
  appId: '' // Opcional: añade el appId de la app web si creas una en Firebase Console
};
