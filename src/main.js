// ================================
// IMPORTS
// ================================
import jsPDF from "jspdf";
import { query, where, getDocs } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";

import { collection, addDoc } from "firebase/firestore";

// ================================
// REFERENCIAS AL DOM
// ================================

async function crearPerfilUsuario(user) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      proveedor: user.providerData[0]?.providerId || "password",
      fechaAlta: new Date(),
      rol: "cliente"
    });

    console.log("Perfil de usuario creado");
  }
}



const pedidosBody = document.getElementById("pedidosBody");

const seccionCliente = document.getElementById("seccionCliente");


const form = document.getElementById("pedidoForm");

const imgMedialunas = document.getElementById("imgMedialunas");

const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const btnGoogle = document.getElementById("btnGoogle");
const btnLogout = document.getElementById("btnLogout");

const userInfo = document.getElementById("userInfo");
const userEmail = document.getElementById("userEmail");

const btnResetPass = document.getElementById("btnResetPass");

const h2ingresar = document.getElementById("h2-ingresar");

const btnTogglePass = document.getElementById("btnTogglePass");
const inputPass = document.getElementById("loginPass");

const loadingPedidos = document.getElementById("loadingPedidos");


const seccionAdmin = document.getElementById("seccionAdmin");

const authSection = document.getElementById("authSection");



// ================================
// AUTENTICACIÓN
// ================================
btnRegister.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    alert("Completá email y contraseña");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    alert("Usuario registrado correctamente");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

btnLogin.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    alert("Completá email y contraseña");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

btnGoogle.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
});


btnResetPass.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();

  if (!email) {
    alert("Ingresá tu email en la casilla de arriba de todo, para restablecer la clave");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Te enviamos un email para restablecer tu clave, puede tardar 1 minuto en llegar (revisá el spam) 📩");
  } catch (error) {
    console.error(error);
    alert("No se pudo enviar el email. Verificá el correo ingresado.");
  }
});


// ================================
// ESTADO DE SESIÓN
// ================================

async function cargarPedidosUsuario(uid) {
  pedidosBody.innerHTML = "";
  loadingPedidos.style.display = "block";

  const q = query(
    collection(db, "pedidos"),
    where("uid", "==", uid)
  );

  const snapshot = await getDocs(q);

  loadingPedidos.style.display = "none";

  if (snapshot.empty) {
    pedidosBody.innerHTML = `
      <tr>
        <td colspan="5">No tenés pedidos todavía</td>
      </tr>
    `;
    return;
  }

  snapshot.forEach((doc) => {
    const pedido = doc.data();

    const tr = document.createElement("tr");

    tr.classList.add(`estado-${pedido.estado.toLowerCase()}`);

    tr.innerHTML = `
      <td>${pedido.fechaCreacion.toDate().toLocaleDateString()}</td>

      <td>
        ${pedido.estado}
        <br>
        <small>
          (${pedido.estadoFecha
            ? pedido.estadoFecha.toDate().toLocaleString()
            : pedido.fechaCreacion.toDate().toLocaleString()})
        </small>
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

      <td>
        ${pedido.notas ? pedido.notas : "<em>—</em>"}
      </td>

      <td>
        <button data-pdf  class="btnPDF">  Descargar PDF  </button> ⬇️ 
      </td>
    `;

    tr.querySelector("button").addEventListener("click", () => {
      generarPDF(pedido);
    });

    pedidosBody.appendChild(tr);
  });
}








onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authSection.style.display = "flex";
    imgMedialunas.style.display = "block";
    seccionCliente.style.display = "none";
    seccionAdmin.style.display = "none";
    btnLogout.style.display = "none";
    userInfo.style.display = "none";
    return;
  }

  // Usuario autenticado
  authSection.style.display = "none";
  h2ingresar.style.display = "none";
  imgMedialunas.style.display = "none";
  btnLogout.style.display = "inline";
  userInfo.style.display = "block";
  userEmail.textContent = user.email;

  await crearPerfilUsuario(user);

  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().rol === "admin") {
    seccionAdmin.style.display = "block";
    seccionCliente.style.display = "none";

    if (window.initAdminPanel) {
      window.initAdminPanel();
    }
    return;
  }

  // Cliente
  seccionCliente.style.display = "flex";
  seccionAdmin.style.display = "none";
  await cargarPedidosUsuario(user.uid);
});



// ================================
// Validacion fecha y hora
// ================================

function configurarFechaMinima() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");

  const fechaHoy = `${yyyy}-${mm}-${dd}`;

  const inputFecha = document.getElementById("fechaEntrega");
  inputFecha.min = fechaHoy;
}

configurarFechaMinima();

function configurarHoraMinima() {
  const inputFecha = document.getElementById("fechaEntrega");
  const inputHora = document.getElementById("horaEntrega");

  inputFecha.addEventListener("change", () => {
    const hoy = new Date();
    const fechaSeleccionada = new Date(inputFecha.value + "T00:00");

    // Si es hoy, bloquear horas pasadas
    if (
      fechaSeleccionada.getFullYear() === hoy.getFullYear() &&
      fechaSeleccionada.getMonth() === hoy.getMonth() &&
      fechaSeleccionada.getDate() === hoy.getDate()
    ) {
      const hh = String(hoy.getHours()).padStart(2, "0");
      const mm = String(hoy.getMinutes()).padStart(2, "0");
      inputHora.min = `${hh}:${mm}`;
    } else {
      // Si es otro día, liberar horas
      inputHora.min = "00:00";
    }
  });
}

configurarHoraMinima();



// ================================
// ENVÍO DE PEDIDO
// ================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert("Tenés que iniciar sesión para hacer un pedido");
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const emailCliente = document.getElementById("email").value.trim();

const medialunaBandeja = Number(document.getElementById("medialunaBandeja").value) || 0;
const surtidasBandeja = Number(document.getElementById("surtidasBandeja").value) || 0;
const medialunaGrasa = Number(document.getElementById("medialunaGrasa").value) || 0;
const medialunaManteca = Number(document.getElementById("medialunaManteca").value) || 0;
const frolaMembrillo = Number(document.getElementById("frolaMembrillo").value) || 0;
const frolaBatata = Number(document.getElementById("frolaBatata").value) || 0;
const ricota = Number(document.getElementById("ricota").value) || 0;
const ricotaDDL = Number(document.getElementById("ricotaDDL").value) || 0;


  const notas = document.getElementById("notas").value.trim();
  const fechaEntrega = document.getElementById("fechaEntrega").value;
  const horaEntrega = document.getElementById("horaEntrega").value;

  if (!nombre || !telefono || !emailCliente || !fechaEntrega || !horaEntrega) {
    alert("Completá todos los datos obligatorios");
    return;
  }

  const pedido = {
    uid: auth.currentUser.uid,
    emailCuenta: auth.currentUser.email,

    cliente: {
      nombre,
      telefono,
      email: emailCliente
    },

productos: {
  medialunaBandeja,
  surtidasBandeja,
  medialunaGrasa,
  medialunaManteca,
  frolaMembrillo,
  frolaBatata,
  ricota,
  ricotaDDL
},


    notas,
    entrega: {
      fecha: fechaEntrega,
      hora: horaEntrega
    },

    estado: "Pendiente",
    fechaCreacion: new Date(),
    fechaCreacion: new Date()
  };

  try {
    await addDoc(collection(db, "pedidos"), pedido);
    alert("Pedido enviado correctamente 🎉");
    form.reset();
  } catch (error) {
    console.error("Error al guardar pedido:", error);
    alert("Hubo un error al enviar el pedido");
  }
});




// PDF

function generarPDF(pedido) {
  const doc = new jsPDF();

  doc.text("Pedido de Medialunas", 10, 10);
  doc.text(`Fecha: ${pedido.fechaCreacion.toDate().toLocaleString()}`, 10, 20);

  doc.text("Cliente:", 10, 30);
  doc.text(`Nombre: ${pedido.cliente.nombre}`, 10, 40);
  doc.text(`Teléfono: ${pedido.cliente.telefono}`, 10, 50);
  doc.text(`Email: ${pedido.cliente.email}`, 10, 60);

  doc.text("Productos:", 10, 75);
  doc.text(`Medialuna bandeja: ${pedido.productos.medialunaBandeja}`, 10, y);
  doc.text(`Surtidas bandeja: ${pedido.productos.surtidasBandeja}`, 10, y += 10);
  doc.text(`Medialuna grasa: ${pedido.productos.medialunaGrasa}`, 10, y += 10);
  doc.text(`Medialuna manteca: ${pedido.productos.medialunaManteca}`, 10, y += 10);
  doc.text(`Frola membrillo: ${pedido.productos.frolaMembrillo}`, 10, y += 10);
  doc.text(`Frola batata: ${pedido.productos.frolaBatata}`, 10, y += 10);
  doc.text(`Ricota: ${pedido.productos.ricota}`, 10, y += 10);
  doc.text(`Ricota c/ DDL: ${pedido.productos.ricotaDDL}`, 10, y += 10);


  doc.text(`Estado: ${pedido.estado}`, 10, 120);

  doc.save("pedido.pdf");
}



// OJITO

btnTogglePass.addEventListener("click", () => {
  if (inputPass.type === "password") {
    inputPass.type = "text";
    btnTogglePass.textContent = "🙈";
  } else {
    inputPass.type = "password";
    btnTogglePass.textContent = "👁️";
  }
});



// Flechita para subir


const btnScrollTop = document.getElementById("btnScrollTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    btnScrollTop.style.display = "block";
  } else {
    btnScrollTop.style.display = "none";
  }
});

btnScrollTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

