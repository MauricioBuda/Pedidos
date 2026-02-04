// ================================
// IMPORTS
// ================================
import { auth, db } from "./firebase";
import {
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query
} from "firebase/firestore";

import jsPDF from "jspdf";


let pedidosCache = [];

let filtroClienteActivo = null;



// ================================
// DOM
// ================================
const tbody = document.getElementById("adminPedidosBody");
const btnLogout = document.getElementById("btnLogout");

// ================================
// LOGOUT
// ================================
btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});

// ================================
// VERIFICAR ROL ADMIN
// ================================
import { getDoc } from "firebase/firestore";

async function verificarAdmin(user) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists() || snap.data().rol !== "admin") {
    alert("Acceso denegado");
    window.location.href = "/";
  }
}

const loadingAdmin = document.getElementById("loadingAdmin");

const filtroEstado = document.getElementById("filtroEstado");

const busquedaCliente = document.getElementById("busquedaCliente");
const sugerenciasClientes = document.getElementById("sugerenciasClientes");



const filtroClienteBox = document.getElementById("filtroClienteActivoBox");
const filtroClienteTexto = document.getElementById("filtroClienteTexto");
const btnLimpiarFiltroCliente = document.getElementById("btnLimpiarFiltroCliente");


const contadorPedidosNumero = document.getElementById("contadorPedidosNumero");



btnLimpiarFiltroCliente.addEventListener("click", () => {
  filtroClienteActivo = null;
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


  busquedaCliente.addEventListener("input", () => {
  if (busquedaCliente.value === "") {
    filtroClienteActivo = null;
    cargarPedidos();
  }
});



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
    return;
  }

  pedidosCache = [];
  snapshot.forEach(docSnap => {
    pedidosCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  let hayResultados = false;

  // 👉 Sugerencias únicas
  const sugerenciasMap = new Map();

  pedidosCache.forEach((pedido) => {
    const nombre = pedido.cliente.nombre?.trim();
    const email = pedido.cliente.email?.trim();

    if (nombre) {
      sugerenciasMap.set(`nombre:${nombre}`, {
        tipo: "nombre",
        valor: nombre
      });
    }

    if (email) {
      sugerenciasMap.set(`email:${email}`, {
        tipo: "email",
        valor: email
      });
    }

    // ===== FILTROS =====

    if (
      estadoSeleccionado !== "todos" &&
      pedido.estado !== estadoSeleccionado
    ) {
      return;
    }

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

    const estados = ["pendiente", "entregado", "cancelado"];
    const botonesEstado = estados
      .filter(e => e !== pedido.estado)
      .map(e => `<button data-accion="${e}">${e}</button>`)
      .join("");

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${pedido.fechaCreacion.toDate().toLocaleString()}</td>

      <td>
        ${pedido.cliente.nombre}<br>
        <small>${pedido.cliente.email}</small>
      </td>

      <td>
        Manteca: ${pedido.productos.manteca}<br>
        Grasa: ${pedido.productos.grasa}<br>
        Facturas: ${pedido.productos.facturas}
      </td>

      <td>${pedido.notas || "<em>—</em>"}</td>

      <td>
        ${pedido.estado}
        <br>
        <small>
          (${pedido.estadoFecha
            ? pedido.estadoFecha.toDate().toLocaleString()
            : pedido.fechaCreacion.toDate().toLocaleString()})
        </small>
      </td>

      <td>${botonesEstado}</td>
      <td><button data-pdf>PDF</button></td>
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

  // 👉 Mostrar sugerencias
  mostrarSugerencias(
    [...sugerenciasMap.values()],
    textoBusqueda
  );

  actualizarIndicadorFiltroCliente();
  actualizarContadorPedidos();


}






filtroEstado.addEventListener("change", () => {
  cargarPedidos();
});





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
    li.textContent =
      s.tipo === "email"
        ? `📧 ${s.valor}`
        : `👤 ${s.valor}`;

    li.style.padding = "6px";
    li.style.cursor = "pointer";

    li.addEventListener("click", () => {
      // 🔑 1. Guardamos el filtro real
      filtroClienteActivo = s.valor;

      // 🔑 2. Limpiamos el input visual
      busquedaCliente.value = "";

      // 🔑 3. Ocultamos sugerencias
      sugerenciasClientes.style.display = "none";


      actualizarIndicadorFiltroCliente();


      // 🔑 4. Recargamos pedidos con filtro activo
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
  doc.text(`Manteca: ${pedido.productos.manteca}`, 10, 65);
  doc.text(`Grasa: ${pedido.productos.grasa}`, 10, 75);
  doc.text(`Facturas: ${pedido.productos.facturas}`, 10, 85);

  doc.text(`Estado: ${pedido.estado}`, 10, 100);

  doc.save("pedido-admin.pdf");
}

// ================================
// SESIÓN
// ================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/";
    return;
  }

  await verificarAdmin(user);
  await cargarPedidos();
});





// Buscador filtro

busquedaCliente.addEventListener("input", () => {
  cargarPedidos();
});

filtroEstado.addEventListener("change", () => {
  cargarPedidos();
});





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


