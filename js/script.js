let gastosDB;

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

async function inicializarApp() {
    try {
        gastosDB = new GastosDB();
        console.log('App inicializada');
        
        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fecha1').value = hoy;
        document.getElementById('fecha2').value = hoy;

        // Cargar gastos existentes
        await cargarGastosIniciales();
    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('Error al inicializar la aplicación');
    }
}

async function cargarGastosIniciales() {
    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');
        
        actualizarListaGastos('Lucas', gastosLucas);
        actualizarListaGastos('Patri', gastosPatri);
    } catch (error) {
        console.error('Error al cargar gastos:', error);
        mostrarError('Error al cargar los gastos');
    }
}

async function agregarGasto(usuario) {
    console.log('Agregando gasto para:', usuario);
    const index = usuario === 'Lucas' ? '1' : '2';
    
    const datos = {
        fecha: document.getElementById(`fecha${index}`).value,
        categoria: document.getElementById(`categoria${index}`).value,
        monto: document.getElementById(`gasto${index}`).value
    };

    if (!validarEntradaGasto(datos)) {
        mostrarError('Por favor, complete todos los campos correctamente');
        return;
    }

    try {
        await gastosDB.agregarGasto(usuario, datos);
        
        // Recargar los gastos
        const gastosActualizados = await gastosDB.obtenerGastos(usuario);
        actualizarListaGastos(usuario, gastosActualizados);
        
        limpiarFormularioGasto(index);
        mostrarMensajeExito('Gasto agregado correctamente');
    } catch (error) {
        console.error('Error al agregar gasto:', error);
        mostrarError('Error al guardar el gasto');
    }
}

function validarEntradaGasto(datos) {
    if (!datos.fecha || !datos.categoria || !datos.monto || isNaN(datos.monto) || datos.monto <= 0) {
        return false;
    }
    return true;
}

function actualizarListaGastos(usuario, gastos) {
    const contenedor = document.querySelector(`#lista-gastos-${usuario.toLowerCase()} .gastos-scroll`);
    const totalElement = document.querySelector(`#lista-gastos-${usuario.toLowerCase()} .total-usuario strong`);
    
    if (!contenedor || !totalElement) {
        console.error('No se encontraron los elementos del DOM necesarios');
        return;
    }

    let html = '';
    let total = 0;

    gastos.forEach(gasto => {
        total += parseFloat(gasto.monto);
        html += `
            <div class="gasto-item">
                <div class="gasto-fecha">${formatearFecha(gasto.fecha)}</div>
                <div class="gasto-info">
                    <span class="gasto-categoria">${gasto.categoria}</span>
                    <span class="gasto-monto">${formatearDinero(gasto.monto)}</span>
                </div>
                <button onclick="eliminarGasto('${gasto.id}', '${usuario}')" class="btn-eliminar-gasto">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    contenedor.innerHTML = html;
    totalElement.textContent = formatearDinero(total);
}

async function eliminarGasto(id, usuario) {
    try {
        await gastosDB.eliminarGasto(id);
        const gastosActualizados = await gastosDB.obtenerGastos(usuario);
        actualizarListaGastos(usuario, gastosActualizados);
        mostrarMensajeExito('Gasto eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        mostrarError('Error al eliminar el gasto');
    }
}

function formatearDinero(cantidad) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(cantidad);
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES');
}

function limpiarFormularioGasto(index) {
    document.getElementById(`categoria${index}`).value = '';
    document.getElementById(`gasto${index}`).value = '';
}

function mostrarError(mensaje) {
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            ${mensaje}
        </div>
    `;
    resultado.classList.add('mostrar');
    
    setTimeout(() => {
        resultado.classList.remove('mostrar');
    }, 3000);
}

function mostrarMensajeExito(mensaje) {
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = `
        <div class="exito">
            <i class="fas fa-check-circle"></i>
            ${mensaje}
        </div>
    `;
    resultado.classList.add('mostrar');
    
    setTimeout(() => {
        resultado.classList.remove('mostrar');
    }, 3000);
}

async function mostrarInforme() {
    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');
        
        // Calcular totales por categoría
        const categorias = ['Supermercado', 'Restaurantes', 'Transporte', 'Ocio', 'Hogar', 'Otros'];
        const totalesPorCategoria = {
            Lucas: {},
            Patri: {}
        };

        // Inicializar totales
        categorias.forEach(cat => {
            totalesPorCategoria.Lucas[cat] = 0;
            totalesPorCategoria.Patri[cat] = 0;
        });

        // Calcular totales
        gastosLucas.forEach(gasto => {
            totalesPorCategoria.Lucas[gasto.categoria] += parseFloat(gasto.monto);
        });
        gastosPatri.forEach(gasto => {
            totalesPorCategoria.Patri[gasto.categoria] += parseFloat(gasto.monto);
        });

        const totalLucas = gastosLucas.reduce((sum, gasto) => sum + parseFloat(gasto.monto), 0);
        const totalPatri = gastosPatri.reduce((sum, gasto) => sum + parseFloat(gasto.monto), 0);

        // Crear ventana modal
        const modal = document.createElement('div');
        modal.className = 'modal-informe';
        
        let html = `
            <div class="modal-content">
                <h2>Informe Detallado de Gastos</h2>
                <div class="informe-grid">
                    <div class="informe-seccion">
                        <h3>Gastos por Categoría</h3>
                        <table>
                            <tr>
                                <th>Categoría</th>
                                <th>Lucas</th>
                                <th>Patri</th>
                            </tr>
                            ${categorias.map(cat => `
                                <tr>
                                    <td>${cat}</td>
                                    <td>${formatearDinero(totalesPorCategoria.Lucas[cat])}</td>
                                    <td>${formatearDinero(totalesPorCategoria.Patri[cat])}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    <div class="informe-totales">
                        <h3>Totales</h3>
                        <p>Lucas: <strong>${formatearDinero(totalLucas)}</strong></p>
                        <p>Patri: <strong>${formatearDinero(totalPatri)}</strong></p>
                        <p class="total-final">Total: <strong>${formatearDinero(totalLucas + totalPatri)}</strong></p>
                    </div>
                </div>
                <button class="btn-cerrar" onclick="this.parentElement.parentElement.remove()">Cerrar</button>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);

    } catch (error) {
        mostrarError('Error al generar el informe');
    }
}

async function reiniciarGastos() {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los gastos?')) {
        return;
    }

    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');
        
        // Eliminar todos los gastos
        for (const gasto of gastosLucas) {
            await gastosDB.eliminarGasto(gasto.id);
        }
        for (const gasto of gastosPatri) {
            await gastosDB.eliminarGasto(gasto.id);
        }
        
        // Actualizar las listas
        actualizarListaGastos('Lucas', []);
        actualizarListaGastos('Patri', []);
        
        mostrarMensajeExito('Todos los gastos han sido eliminados');
    } catch (error) {
        mostrarError('Error al reiniciar los gastos');
    }
}
