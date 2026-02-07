// ================================
// IMPORTS
// ================================
import { db } from "./firebase";
import {
  query,
  where,
  getDocs,
  collection,
  doc,
  getDoc,
  setDoc,
  orderBy,
  runTransaction
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
    tbody.innerHTML = `<tr><td colspan="8">No hay pedidos</td></tr>`;
    actualizarContadorPedidos();
    return;
  }

  pedidosCache = [];
  snapshot.forEach(docSnap => {
    pedidosCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  tbody.innerHTML = "";

  pedidosCache.forEach((pedido) => {

    if (estadoSeleccionado !== "todos" && pedido.estado !== estadoSeleccionado) return;

    const nombre = pedido.cliente?.nombre?.toLowerCase() || "";
    const email = pedido.cliente?.email?.toLowerCase() || "";

    if (textoBusqueda && !nombre.includes(textoBusqueda) && !email.includes(textoBusqueda)) return;

    const estados = ["Pendiente", "Entregado", "Cancelado"];
    const botonesEstado = estados
      .filter(e => e !== pedido.estado)
      .map(e => `<button data-accion="${e}">${e}</button>`)
      .join("");

    const tr = document.createElement("tr");
    tr.classList.add(`estado-${pedido.estado.toLowerCase()}`);

    tr.innerHTML = `
      <td><strong>#${String(pedido.numeroPedido).padStart(6, "0")}</strong></td>
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
      <td><button class="btnPDF">Descargar PDF</button></td>
    `;

    tr.querySelectorAll("[data-accion]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await setDoc(doc(db, "pedidos", pedido.id), {
          ...pedido,
          estado: btn.dataset.accion,
          estadoFecha: new Date()
        });
        cargarPedidos();
      });
    });

    tr.querySelector(".btnPDF").addEventListener("click", () => {
      generarPDF(pedido);
    });

    tbody.appendChild(tr);
  });

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
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // =========================
  // TÍTULO
  // =========================
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("Pedido recibido", pageWidth / 2, y, { align: "center" });

  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(
    `Pedido Nº ${String(pedido.numeroPedido).padStart(6, "0")}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    `PDF generado el ${new Date().toLocaleString()}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // Línea
  y += 8;
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);

  // =========================
  // DATOS CLIENTE
  // =========================
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Datos del cliente", 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(`Nombre: ${pedido.cliente.nombre}`, 15, y); y += 6;
  doc.text(`Email: ${pedido.cliente.email}`, 15, y); y += 6;
  doc.text(`Teléfono: ${pedido.cliente.telefono}`, 15, y); y += 6;
  doc.text(
    `Fecha del pedido: ${pedido.fechaCreacion.toDate().toLocaleString()}`,
    15,
    y
  );

  // Línea
  y += 8;
  doc.line(15, y, pageWidth - 15, y);

  // =========================
  // PRODUCTOS
  // =========================
  y += 10;
  doc.setFontSize(12);
  doc.text("Productos solicitados", 15, y);

  y += 8;
  doc.setFontSize(10);

  const productos = [
    ["Medialuna por bandeja", pedido.productos.medialunaBandeja],
    ["Surtidas por bandeja", pedido.productos.surtidasBandeja],
    ["Medialuna de grasa", pedido.productos.medialunaGrasa],
    ["Medialuna de manteca", pedido.productos.medialunaManteca],
    ["Frola de membrillo", pedido.productos.frolaMembrillo],
    ["Frola de batata", pedido.productos.frolaBatata],
    ["Ricota", pedido.productos.ricota],
    ["Ricota c/ dulce de leche", pedido.productos.ricotaDDL],
  ];

  productos.forEach(([nombre, cantidad]) => {
    doc.text(`${nombre}:`, 15, y);
    doc.text(String(cantidad), pageWidth - 20, y, { align: "right" });
    y += 6;
  });

  // Línea
  y += 4;
  doc.line(15, y, pageWidth - 15, y);

  // =========================
  // NOTAS
  // =========================
  y += 10;
  doc.setFontSize(12);
  doc.text("Notas", 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(pedido.notas || "— Sin notas —", 15, y);

  // Línea
  y += 8;
  doc.line(15, y, pageWidth - 15, y);

  // =========================
  // ESTADO
  // =========================
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(0);

  const fechaEstado = pedido.estadoFecha
    ? pedido.estadoFecha.toDate().toLocaleString()
    : pedido.fechaCreacion.toDate().toLocaleString();

  let textoEstado =
    pedido.estado === "Pendiente"
      ? `Estado del pedido: ${pedido.estado} (desde ${fechaEstado} hs)`
      : `Estado del pedido: ${pedido.estado} (${fechaEstado})`;

  doc.text(textoEstado, 15, y);

  doc.save(`pedido-${String(pedido.numeroPedido).padStart(6, "0")}.pdf`);
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
