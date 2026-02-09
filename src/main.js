// ================================
// IMPORTS
// ================================

import jsPDF from "jspdf";
import { query, where, getDocs, collection } from "firebase/firestore";
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";




// ================================
// REFERENCIAS AL DOM
// ================================

const logo = "/img/LogoMedialunas.png";



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
const hrMobileUser = document.getElementById("hrMobileUser");

const btnResetPass = document.getElementById("btnResetPass");

const h2ingresar = document.getElementById("h2-ingresar");

const primerSection = document.getElementById("primer-section");

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
  <td><strong>#${String(pedido.numeroPedido).padStart(6, "0")}</strong></td>
  <td>${pedido.fechaCreacion.toDate().toLocaleDateString()}</td>
  <td>
    ${pedido.estado}<br>
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
  <td>${pedido.notas || "<em>—</em>"}</td>
  <td>
    <button class="btnPDF">Descargar PDF</button>
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
    imgMedialunas.style.display = "flex";
    seccionCliente.style.display = "none";
    seccionAdmin.style.display = "none";
    btnLogout.style.display = "none";
    userInfo.style.display = "none";
    hrMobileUser.style.display = "none";

    primerSection.style.flexDirection = "column";
    return;
  }

  // Usuario autenticado
  authSection.style.display = "none";
  h2ingresar.style.display = "none";
  imgMedialunas.style.display = "none";
  btnLogout.style.display = "inline";
  userInfo.style.display = "block";
  hrMobileUser.style.display = "block";
  userEmail.textContent = user.email;

  primerSection.style.flexDirection = "row-reverse";

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

  try {
    const contadorRef = doc(db, "contadores", "pedidos");
    const pedidosRef = collection(db, "pedidos");

    await runTransaction(db, async (transaction) => {
      const contadorSnap = await transaction.get(contadorRef);

      if (!contadorSnap.exists()) {
        throw new Error("No existe el contador de pedidos");
      }

      const ultimoNumero = contadorSnap.data().ultimoNumero;
      const nuevoNumero = ultimoNumero + 1;

      transaction.update(contadorRef, {
        ultimoNumero: nuevoNumero
      });

      const nuevoPedidoRef = doc(pedidosRef);

      transaction.set(nuevoPedidoRef, {
        numeroPedido: nuevoNumero,

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
        fechaCreacion: new Date()
      });
    });

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
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 25;


const logoWidth = 35;
const logoHeight = 15;

doc.addImage(
  logo,
  "PNG",
  pageWidth - logoWidth - 15,
  10,
  logoWidth,
  logoHeight
);


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





// FLECHITA

// const btnScrollTop = document.getElementById("btnScrollTop");

// window.addEventListener("scroll", () => {
//   if (window.scrollY > 200) {
//     btnScrollTop.style.display = "block";
//   } else {
//     btnScrollTop.style.display = "none";
//   }
// });

// btnScrollTop.addEventListener("click", () => {
//   window.scrollTo({
//     top: 0,
//     behavior: "smooth"
//   });
// });


