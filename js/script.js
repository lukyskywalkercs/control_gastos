let gastosDB;
let graficos = {};

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    verificarGastosRecurrentes();
});

async function inicializarApp() {
    try {
        gastosDB = new GastosDB();
        console.log('App inicializada');
        
        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fecha1').value = hoy;
        document.getElementById('fecha2').value = hoy;
        document.getElementById('fecha-desde').value = hoy;
        document.getElementById('fecha-hasta').value = hoy;

        // Cargar gastos existentes
        await cargarGastosIniciales();
        actualizarGraficos();
    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('Error al inicializar la aplicación');
    }
}

async function verificarGastosRecurrentes() {
    try {
        await gastosDB.procesarGastosRecurrentes();
        await cargarGastosIniciales();
    } catch (error) {
        console.error('Error al procesar gastos recurrentes:', error);
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
    const index = usuario === 'Lucas' ? '1' : '2';
    
    const datos = {
        fecha: document.getElementById(`fecha${index}`).value,
        categoria: document.getElementById(`categoria${index}`).value,
        monto: document.getElementById(`gasto${index}`).value,
        recurrente: document.getElementById(`recurrente${index}`).checked
    };

    if (!validarEntradaGasto(datos)) {
        mostrarError('Por favor, complete todos los campos correctamente');
        return;
    }

    try {
        await gastosDB.agregarGasto(usuario, datos);
        const gastosActualizados = await gastosDB.obtenerGastos(usuario);
        actualizarListaGastos(usuario, gastosActualizados);
        actualizarGraficos();
        
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
    
    let html = '';
    let total = 0;

    gastos.forEach(gasto => {
        total += parseFloat(gasto.monto);
        html += `
            <div class="gasto-item ${gasto.recurrente ? 'recurrente' : ''}">
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
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
        return;
    }

    try {
        await gastosDB.eliminarGasto(id);
        const gastosActualizados = await gastosDB.obtenerGastos(usuario);
        actualizarListaGastos(usuario, gastosActualizados);
        actualizarGraficos();
        mostrarMensajeExito('Gasto eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        mostrarError('Error al eliminar el gasto');
    }
}

async function aplicarFiltros() {
    const filtros = {
        fechaDesde: document.getElementById('fecha-desde').value,
        fechaHasta: document.getElementById('fecha-hasta').value,
        categoria: document.getElementById('filtro-categoria').value
    };

    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas', filtros);
        const gastosPatri = await gastosDB.obtenerGastos('Patri', filtros);
        
        actualizarListaGastos('Lucas', gastosLucas);
        actualizarListaGastos('Patri', gastosPatri);
        actualizarGraficos();
    } catch (error) {
        mostrarError('Error al aplicar filtros');
    }
}

function actualizarGraficos() {
    const gastosLucas = obtenerDatosGraficos('Lucas');
    const gastosPatri = obtenerDatosGraficos('Patri');

    const ctx1 = document.getElementById('graficoCategoriasLucas').getContext('2d');
    const ctx2 = document.getElementById('graficoCategoriasPatri').getContext('2d');
    const ctx3 = document.getElementById('graficoComparativo').getContext('2d');

    // Destruir gráficos existentes
    Object.values(graficos).forEach(grafico => grafico?.destroy());

    // Crear nuevos gráficos
    graficos.lucas = new Chart(ctx1, configurarGraficoTorta('Lucas', gastosLucas));
    graficos.patri = new Chart(ctx2, configurarGraficoTorta('Patri', gastosPatri));
    graficos.comparativo = new Chart(ctx3, configurarGraficoBarras(gastosLucas, gastosPatri));
}

function obtenerDatosGraficos(usuario) {
    const contenedor = document.querySelector(`#lista-gastos-${usuario.toLowerCase()} .gastos-scroll`);
    const gastos = Array.from(contenedor.querySelectorAll('.gasto-item')).map(item => ({
        categoria: item.querySelector('.gasto-categoria').textContent,
        monto: parseFloat(item.querySelector('.gasto-monto').textContent.replace('€', '').replace('.', '').replace(',', '.'))
    }));

    const categorias = ['Supermercado', 'Restaurantes', 'Transporte', 'Ocio', 'Hogar', 'Otros'];
    const totalesPorCategoria = {};
    
    categorias.forEach(cat => {
        totalesPorCategoria[cat] = gastos
            .filter(g => g.categoria === cat)
            .reduce((sum, g) => sum + g.monto, 0);
    });

    return totalesPorCategoria;
}

function configurarGraficoTorta(usuario, datos) {
    const categorias = Object.keys(datos);
    const valores = Object.values(datos);
    const hayDatos = valores.some(v => v > 0);

    return {
        type: 'pie',
        data: {
            labels: categorias,
            datasets: [{
                data: hayDatos ? valores : [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Gastos por Categoría - ${usuario}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    };
}

function configurarGraficoBarras(datosLucas, datosPatri) {
    const categorias = Object.keys(datosLucas);
    const valoresLucas = Object.values(datosLucas);
    const valoresPatri = Object.values(datosPatri);
    const hayDatos = [...valoresLucas, ...valoresPatri].some(v => v > 0);

    return {
        type: 'bar',
        data: {
            labels: categorias,
            datasets: [
                {
                    label: 'Lucas',
                    data: hayDatos ? valoresLucas : [],
                    backgroundColor: '#36A2EB'
                },
                {
                    label: 'Patri',
                    data: hayDatos ? valoresPatri : [],
                    backgroundColor: '#FF6384'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparativa por Categorías',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatearDinero(value)
                    }
                }
            }
        }
    };
}

async function mostrarInforme() {
    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');
        
        const categorias = ['Supermercado', 'Restaurantes', 'Transporte', 'Ocio', 'Hogar', 'Otros'];
        const totalesPorCategoria = {
            Lucas: {},
            Patri: {}
        };

        categorias.forEach(cat => {
            totalesPorCategoria.Lucas[cat] = gastosLucas
                .filter(g => g.categoria === cat)
                .reduce((sum, g) => sum + parseFloat(g.monto), 0);
            
            totalesPorCategoria.Patri[cat] = gastosPatri
                .filter(g => g.categoria === cat)
                .reduce((sum, g) => sum + parseFloat(g.monto), 0);
        });

        const totalLucas = Object.values(totalesPorCategoria.Lucas).reduce((a, b) => a + b, 0);
        const totalPatri = Object.values(totalesPorCategoria.Patri).reduce((a, b) => a + b, 0);

        const modal = document.createElement('div');
        modal.className = 'modal-informe';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="btn-cerrar">
                    <i class="fas fa-times"></i>
                </button>
                <h2>Informe Detallado de Gastos</h2>
                <div class="informe-grid">
                    <div class="informe-seccion">
                        <h3>Gastos por Categoría</h3>
                        <table>
                            <tr>
                                <th>Categoría</th>
                                <th>Lucas</th>
                                <th>Patri</th>
                                <th>Total</th>
                            </tr>
                            ${categorias.map(cat => `
                                <tr>
                                    <td>${cat}</td>
                                    <td>${formatearDinero(totalesPorCategoria.Lucas[cat])}</td>
                                    <td>${formatearDinero(totalesPorCategoria.Patri[cat])}</td>
                                    <td>${formatearDinero(totalesPorCategoria.Lucas[cat] + totalesPorCategoria.Patri[cat])}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td><strong>${formatearDinero(totalLucas)}</strong></td>
                                <td><strong>${formatearDinero(totalPatri)}</strong></td>
                                <td><strong>${formatearDinero(totalLucas + totalPatri)}</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        modal.querySelector('.btn-cerrar').onclick = () => {
            modal.remove();
        };

    } catch (error) {
        mostrarError('Error al generar el informe');
    }
}

async function exportarExcel() {
    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');

        const wb = XLSX.utils.book_new();
        
        const wsLucas = XLSX.utils.json_to_sheet(
            gastosLucas.map(formatearGastoParaExcel)
        );
        XLSX.utils.book_append_sheet(wb, wsLucas, "Gastos Lucas");
        
        const wsPatri = XLSX.utils.json_to_sheet(
            gastosPatri.map(formatearGastoParaExcel)
        );
        XLSX.utils.book_append_sheet(wb, wsPatri, "Gastos Patri");
        
        XLSX.writeFile(wb, `Gastos_${formatearFecha(new Date())}.xlsx`);
        
        mostrarMensajeExito('Archivo Excel generado correctamente');
    } catch (error) {
        mostrarError('Error al exportar a Excel');
    }
}

function formatearGastoParaExcel(gasto) {
    return {
        Fecha: formatearFecha(gasto.fecha),
        Categoría: gasto.categoria,
        Monto: gasto.monto,
        Recurrente: gasto.recurrente ? 'Sí' : 'No'
    };
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
    document.getElementById(`recurrente${index}`).checked = false;
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

async function reiniciarGastos() {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los gastos?')) {
        return;
    }

    try {
        const gastosLucas = await gastosDB.obtenerGastos('Lucas');
        const gastosPatri = await gastosDB.obtenerGastos('Patri');
        
        for (const gasto of gastosLucas) {
            await gastosDB.eliminarGasto(gasto.id);
        }
        for (const gasto of gastosPatri) {
            await gastosDB.eliminarGasto(gasto.id);
        }
        
        actualizarListaGastos('Lucas', []);
        actualizarListaGastos('Patri', []);
        actualizarGraficos();
        
        mostrarMensajeExito('Todos los gastos han sido eliminados');
    } catch (error) {
        mostrarError('Error al reiniciar los gastos');
    }
}
