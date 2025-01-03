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

            console.log('Guardando gasto en Firestore:', gasto);
            const docRef = await this.gastosRef.add(gasto);
            
            console.log('Gasto guardado con ID:', docRef.id);
            return { id: docRef.id, ...gasto };

        } catch (error) {
            console.error('Error detallado al agregar gasto:', error);
            throw new Error(`Error al guardar el gasto: ${error.message}`);
        }
    }

    async obtenerGastos(usuario) {
        try {
            console.log('Obteniendo gastos para:', usuario);
            
            const snapshot = await this.gastosRef
                .where('usuario', '==', usuario)
                .get();

            const gastos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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

            await this.gastosRef.doc(id).delete();
            console.log('Gasto eliminado correctamente');
            return true;

        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            throw new Error('Error al eliminar el gasto');
        }
    }
}
