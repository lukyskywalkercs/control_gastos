class GastosDB {
    constructor() {
        this.gastosRef = db.collection('gastos');
    }

    async agregarGasto(usuario, datos) {
        try {
            console.log('Iniciando agregación de gasto:', { usuario, datos });

            const gasto = {
                usuario: usuario,
                categoria: datos.categoria,
                monto: parseFloat(datos.monto),
                fecha: datos.fecha,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (datos.ticket) {
                console.log('Subiendo ticket...');
                const ticketUrl = await this.subirImagen(datos.ticket);
                gasto.ticketUrl = ticketUrl;
            }

            console.log('Guardando gasto en Firestore:', gasto);
            const docRef = await this.gastosRef.add(gasto);
            
            console.log('Gasto guardado con ID:', docRef.id);
            return { id: docRef.id, ...gasto };

        } catch (error) {
            console.error('Error detallado al agregar gasto:', error);
            throw new Error(`Error al guardar el gasto: ${error.message}`);
        }
    }

    async subirImagen(file) {
        try {
            if (!file) return null;

            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`tickets/${fileName}`);

            console.log('Iniciando subida de archivo:', fileName);
            
            const snapshot = await fileRef.put(file);
            console.log('Archivo subido correctamente');

            const downloadURL = await snapshot.ref.getDownloadURL();
            console.log('URL de descarga obtenida:', downloadURL);

            return downloadURL;

        } catch (error) {
            console.error('Error al subir imagen:', error);
            throw new Error('Error al subir el ticket');
        }
    }

    async obtenerGastos(usuario) {
        try {
            console.log('Obteniendo gastos para:', usuario);
            
            const snapshot = await this.gastosRef
                .where('usuario', '==', usuario)
                .orderBy('fecha', 'desc')
                .get();

            const gastos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Gastos obtenidos:', gastos.length);
            return gastos;

        } catch (error) {
            console.error('Error al obtener gastos:', error);
            throw new Error('Error al obtener los gastos');
        }
    }

    async eliminarGasto(id) {
        try {
            console.log('Eliminando gasto:', id);

            const doc = await this.gastosRef.doc(id).get();
            if (!doc.exists) {
                throw new Error('El gasto no existe');
            }

            const data = doc.data();
            
            if (data.ticketUrl) {
                console.log('Eliminando ticket asociado');
                const storageRef = storage.refFromURL(data.ticketUrl);
                await storageRef.delete();
            }

            await this.gastosRef.doc(id).delete();
            console.log('Gasto eliminado correctamente');
            return true;

        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            throw new Error('Error al eliminar el gasto');
        }
    }
}
