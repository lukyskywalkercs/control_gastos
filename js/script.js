let gastosDB;

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    inicializarManejadorImagenes();
});

async function inicializarApp() {
    gastosDB = new GastosDB();
    console.log('App inicializada');
    
    // Establecer fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha1').value = hoy;
    document.getElementById('fecha2').value = hoy;

    // Cargar gastos existentes
    cargarGastosIniciales();
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
        monto: parseFloat(document.getElementById(`gasto${index}`).value),
        ticket: document.getElementById(`ticket${index}`).files[0] || null
    };

    if (!validarEntradaGasto(datos)) {
        mostrarError('Por favor, complete todos los campos correctamente');
        return;
    }

    try {
        const nuevoGasto = await gastosDB.agregarGasto(usuario, datos);
        console.log('Gasto agregado:', nuevoGasto);
        
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
        total += gasto.monto;
        html += `
            <div class="gasto-item">
                <div class="gasto-fecha">${formatearFecha(gasto.fecha)}</div>
                <div class="gasto-info">
                    <span class="gasto-categoria">${gasto.categoria}</span>
                    <span class="gasto-monto">${formatearDinero(gasto.monto)}</span>
                </div>
                ${gasto.ticketUrl ? 
                    `<a href="${gasto.ticketUrl}" target="_blank" class="ver-ticket">
                        <i class="fas fa-receipt"></i>
                    </a>` : 
                    ''
                }
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
    document.getElementById(`ticket${index}`).value = '';
    document.getElementById(`preview${index}`).innerHTML = '';
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

function inicializarManejadorImagenes() {
    ['1', '2'].forEach(index => {
        const inputTicket = document.getElementById(`ticket${index}`);
        const previewDiv = document.getElementById(`preview${index}`);

        inputTicket.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-image" onclick="removeImage('${index}')">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                }
                reader.readAsDataURL(file);
            }
        });
    });
}

function removeImage(index) {
    document.getElementById(`ticket${index}`).value = '';
    document.getElementById(`preview${index}`).innerHTML = '';
}
