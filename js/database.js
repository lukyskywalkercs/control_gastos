class GastosDB {
    constructor() {
        this.gastosRef = db.collection('gastos');
        this.presupuestosRef = db.collection('presupuestos');
        this.recurrentesRef = db.collection('recurrentes');
    }

    async agregarGasto(usuario, datos) {
        try {
            console.log('Iniciando agregación de gasto:', { usuario, datos });

            const gasto = {
                usuario: usuario,
                categoria: datos.categoria,
                monto: parseFloat(datos.monto),
                fecha: datos.fecha,
                recurrente: datos.recurrente || false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Guardando gasto en Firestore:', gasto);
            const docRef = await this.gastosRef.add(gasto);
            
            if (gasto.recurrente) {
                await this.recurrentesRef.add({
                    gastoId: docRef.id,
                    ...gasto
                });
            }
            
            console.log('Gasto guardado con ID:', docRef.id);
            return { id: docRef.id, ...gasto };

        } catch (error) {
            console.error('Error detallado al agregar gasto:', error);
            throw new Error(`Error al guardar el gasto: ${error.message}`);
        }
    }

    async obtenerGastos(usuario, filtros = {}) {
        try {
            console.log('Obteniendo gastos para:', usuario, 'con filtros:', filtros);
            
            let query = this.gastosRef.where('usuario', '==', usuario);

            if (filtros.fechaDesde) {
                query = query.where('fecha', '>=', filtros.fechaDesde);
            }
            if (filtros.fechaHasta) {
                query = query.where('fecha', '<=', filtros.fechaHasta);
            }
            if (filtros.categoria) {
                query = query.where('categoria', '==', filtros.categoria);
            }

            const snapshot = await query.get();

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

            // Eliminar gasto recurrente si existe
            const recurrenteSnapshot = await this.recurrentesRef
                .where('gastoId', '==', id)
                .get();
            
            recurrenteSnapshot.forEach(async (doc) => {
                await doc.ref.delete();
            });

            await this.gastosRef.doc(id).delete();
            console.log('Gasto eliminado correctamente');
            return true;

        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            throw new Error('Error al eliminar el gasto');
        }
    }

    async configurarPresupuesto(usuario, categoria, monto) {
        try {
            const presupuestoRef = this.presupuestosRef.doc(`${usuario}_${categoria}`);
            await presupuestoRef.set({
                usuario,
                categoria,
                monto: parseFloat(monto)
            });
            return true;
        } catch (error) {
            console.error('Error al configurar presupuesto:', error);
            throw new Error('Error al configurar el presupuesto');
        }
    }

    async obtenerPresupuestos(usuario) {
        try {
            const snapshot = await this.presupuestosRef
                .where('usuario', '==', usuario)
                .get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error al obtener presupuestos:', error);
            throw new Error('Error al obtener los presupuestos');
        }
    }

    async procesarGastosRecurrentes() {
        try {
            const hoy = new Date();
            const recurrentesSnapshot = await this.recurrentesRef.get();
            
            for (const doc of recurrentesSnapshot.docs) {
                const gasto = doc.data();
                const ultimaFecha = new Date(gasto.fecha);
                
                // Si ha pasado un mes
                if (hoy.getMonth() !== ultimaFecha.getMonth() || 
                    hoy.getFullYear() !== ultimaFecha.getFullYear()) {
                    
                    // Crear nuevo gasto
                    const nuevoGasto = {
                        ...gasto,
                        fecha: hoy.toISOString().split('T')[0],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    delete nuevoGasto.gastoId;
                    
                    await this.gastosRef.add(nuevoGasto);
                    
                    // Actualizar fecha en recurrentes
                    await doc.ref.update({
                        fecha: nuevoGasto.fecha
                    });
                }
            }
        } catch (error) {
            console.error('Error al procesar gastos recurrentes:', error);
            throw new Error('Error al procesar gastos recurrentes');
        }
    }
}
