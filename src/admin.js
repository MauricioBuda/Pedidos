// ================================
// IMPORTS
// ================================
import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query
} from "firebase/firestore";
import jsPDF from "jspdf";

// ================================
// ESTADO
// ================================
let pedidosCache = [];
let filtroClienteActivo = null;

// ================================
// DOM
// ================================
const tbody = document.getElementById("adminPedidosBody");
const loadingAdmin = document.getElementById("loadingAdmin");

const filtroEstado = document.getElementById("filtroEstado");
const busquedaCliente = document.getElementById("busquedaCliente");
const sugerenciasClientes = document.getElementById("sugerenciasClientes");

const filtroClienteBox = document.getElementById("filtroClienteActivoBox");
const filtroClienteTexto = document.getElementById("filtroClienteTexto");
const btnLimpiarFiltroCliente = document.getElementById("btnLimpiarFiltroCliente");

const contadorPedidosNumero = document.getElementById("contadorPedidosNumero");

// ================================
// EVENTOS (UNA SOLA VEZ)
// ================================
filtroEstado.addEventListener("change", () => {
  cargarPedidos();
});

busquedaCliente.addEventListener("input", () => {
  const texto = busquedaCliente.value.trim();

  if (texto === "") {
    filtroClienteActivo = null;
    sugerenciasClientes.style.display = "none";
    actualizarIndicadorFiltroCliente();
    cargarPedidos();
    return;
  }

  cargarPedidos();
});



busquedaCliente.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    busquedaCliente.value = "";
    filtroClienteActivo = null;
    sugerenciasClientes.style.display = "none";
    actualizarIndicadorFiltroCliente();
    cargarPedidos();
  }
});




document.addEventListener("click", (e) => {
  if (
    !busquedaCliente.contains(e.target) &&
    !sugerenciasClientes.contains(e.target)
  ) {
    sugerenciasClientes.style.display = "none";
  }
});






btnLimpiarFiltroCliente.addEventListener("click", () => {
  filtroClienteActivo = null;
  busquedaCliente.value = "";
  actualizarIndicadorFiltroCliente();
  cargarPedidos();
});

// ================================
// CARGAR PEDIDOS
// ================================
async function cargarPedidos() {
  tbody.innerHTML = "";
  loadingAdmin.style.display = "block";

  const estadoSeleccionado = filtroEstado.value;
  const textoBusqueda = busquedaCliente.value.toLowerCase();
  const filtroActivo = filtroClienteActivo?.toLowerCase();

  const q = query(
    collection(db, "pedidos"),
    orderBy("fechaCreacion", "desc")
  );

  const snapshot = await getDocs(q);
  loadingAdmin.style.display = "none";

  if (snapshot.empty) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">No hay pedidos</td>
      </tr>
    `;
    actualizarContadorPedidos();
    return;
  }

  pedidosCache = [];
  snapshot.forEach(docSnap => {
    pedidosCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  let hayResultados = false;
  const sugerenciasMap = new Map();

  pedidosCache.forEach((pedido) => {
    const nombre = pedido.cliente?.nombre?.trim();
    const email = pedido.cliente?.email?.trim();

    if (nombre) {
      sugerenciasMap.set(`nombre:${nombre}`, { tipo: "nombre", valor: nombre });
    }
    if (email) {
      sugerenciasMap.set(`email:${email}`, { tipo: "email", valor: email });
    }

    // ===== FILTRO POR ESTADO =====
    if (estadoSeleccionado !== "todos" && pedido.estado !== estadoSeleccionado) {
      return;
    }

    // ===== FILTRO POR CLIENTE =====
    if (filtroActivo) {
      const matchNombre = nombre?.toLowerCase().includes(filtroActivo);
      const matchEmail = email?.toLowerCase().includes(filtroActivo);
      if (!matchNombre && !matchEmail) return;
    } else if (textoBusqueda) {
      const matchNombre = nombre?.toLowerCase().includes(textoBusqueda);
      const matchEmail = email?.toLowerCase().includes(textoBusqueda);
      if (!matchNombre && !matchEmail) return;
    }

    hayResultados = true;

    const estados = ["Pendiente", "Entregado", "Cancelado"];
    const botonesEstado = estados
      .filter(e => e !== pedido.estado)
      .map(e => `<button data-accion="${e}">${e}</button>`)
      .join("");

    const tr = document.createElement("tr");

    tr.classList.add(`estado-${pedido.estado.toLowerCase()}`);


    tr.innerHTML = `
      <td>${pedido.fechaCreacion.toDate().toLocaleString()}</td>
      <td>
        ${pedido.cliente.nombre}<br>
        <small>${pedido.cliente.email}</small>
      </td>
        <td>
          Medialuna bandeja: ${pedido.productos.medialunaBandeja}<br>
          Surtidas bandeja: ${pedido.productos.surtidasBandeja}<br>
          Medialuna grasa: ${pedido.productos.medialunaGrasa}<br>
          Medialuna manteca: ${pedido.productos.medialunaManteca}<br>
          Frola membrillo: ${pedido.productos.frolaMembrillo}<br>
          Frola batata: ${pedido.productos.frolaBatata}<br>
          Ricota: ${pedido.productos.ricota}<br>
          Ricota c/ DDL: ${pedido.productos.ricotaDDL}
        </td>

      <td>${pedido.notas || "<em>—</em>"}</td>
      <td>
        ${pedido.estado}<br>
        <small>
          (${pedido.estadoFecha
            ? pedido.estadoFecha.toDate().toLocaleString()
            : pedido.fechaCreacion.toDate().toLocaleString()})
        </small>
      </td>
      <td>${botonesEstado}</td>
      <td>  <button data-pdf  class="btnPDF">  Descargar PDF  </button> ⬇️ </td>
    `;

    tr.querySelectorAll("[data-accion]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "pedidos", pedido.id), {
          estado: btn.dataset.accion,
          estadoFecha: new Date()
        });
        cargarPedidos();
      });
    });

    tr.querySelector("[data-pdf]").addEventListener("click", () => {
      generarPDF(pedido);
    });

    tbody.appendChild(tr);
  });

  if (!hayResultados) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">No hay pedidos que coincidan</td>
      </tr>
    `;
  }

  mostrarSugerencias([...sugerenciasMap.values()], textoBusqueda);
  actualizarIndicadorFiltroCliente();
  actualizarContadorPedidos();
}

// ================================
// SUGERENCIAS
// ================================
function mostrarSugerencias(sugerencias, texto) {
  sugerenciasClientes.innerHTML = "";

  if (!texto) {
    sugerenciasClientes.style.display = "none";
    return;
  }

  const filtradas = sugerencias.filter(s =>
    s.valor.toLowerCase().includes(texto)
  );

  if (filtradas.length === 0) {
    sugerenciasClientes.style.display = "none";
    return;
  }

  filtradas.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s.tipo === "email"
      ? `📧 ${s.valor}`
      : `👤 ${s.valor}`;

    li.style.padding = "6px";
    li.style.cursor = "pointer";

    li.addEventListener("click", () => {
      filtroClienteActivo = s.valor;
      busquedaCliente.value = "";
      sugerenciasClientes.style.display = "none";
      actualizarIndicadorFiltroCliente();
      cargarPedidos();
    });

    sugerenciasClientes.appendChild(li);
  });

  sugerenciasClientes.style.display = "block";
}

// ================================
// PDF
// ================================
function generarPDF(pedido) {
  const doc = new jsPDF();

  doc.text("Pedido - Panel Admin", 10, 10);
  doc.text(`Cliente: ${pedido.cliente.nombre}`, 10, 20);
  doc.text(`Email: ${pedido.cliente.email}`, 10, 30);
  doc.text(`Teléfono: ${pedido.cliente.telefono}`, 10, 40);

  doc.text("Productos:", 10, 55);
  doc.text(`Medialuna bandeja: ${pedido.productos.medialunaBandeja}`, 10, y);
  doc.text(`Surtidas bandeja: ${pedido.productos.surtidasBandeja}`, 10, y += 10);
  doc.text(`Medialuna grasa: ${pedido.productos.medialunaGrasa}`, 10, y += 10);
  doc.text(`Medialuna manteca: ${pedido.productos.medialunaManteca}`, 10, y += 10);
  doc.text(`Frola membrillo: ${pedido.productos.frolaMembrillo}`, 10, y += 10);
  doc.text(`Frola batata: ${pedido.productos.frolaBatata}`, 10, y += 10);
  doc.text(`Ricota: ${pedido.productos.ricota}`, 10, y += 10);
  doc.text(`Ricota c/ DDL: ${pedido.productos.ricotaDDL}`, 10, y += 10);


  doc.text(`Estado: ${pedido.estado}`, 10, 100);

  doc.save("pedido-admin.pdf");
}

// ================================
// UI AUX
// ================================
function actualizarContadorPedidos() {
  const filas = tbody.querySelectorAll("tr");
  contadorPedidosNumero.textContent = filas.length;
}

function actualizarIndicadorFiltroCliente() {
  if (filtroClienteActivo) {
    filtroClienteTexto.textContent = `"${filtroClienteActivo}"`;
    filtroClienteBox.style.display = "block";
  } else {
    filtroClienteBox.style.display = "none";
    filtroClienteTexto.textContent = "";
  }
}

// ================================
// INIT (llamado desde main.js)
// ================================
window.initAdminPanel = async function () {
  await cargarPedidos();
};
