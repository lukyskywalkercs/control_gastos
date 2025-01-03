const firebaseConfig = {
    apiKey: "AIzaSyBRz3uV01V0rsp8pKDcySxxeEHaioukMV0",
    authDomain: "comparador-qyc4w6.firebaseapp.com",
    projectId: "comparador-qyc4w6",
    storageBucket: "comparador-qyc4w6.appspot.com",
    messagingSenderId: "1020722749427",
    appId: "1:1020722749427:android:8f25ed84dce816895d3c86"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const db = firebase.firestore();
const storage = firebase.storage();

// Habilitar persistencia offline
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Error de persistencia: múltiples pestañas abiertas');
        } else if (err.code == 'unimplemented') {
            console.log('El navegador no soporta persistencia');
        }
    });
