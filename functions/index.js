const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");

// ================================
// CONFIGURACIÓN GLOBAL
// ================================
setGlobalOptions({
  region: "us-central1",
});

// ================================
// TRANSPORTER GMAIL
// ================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASS,
  },
});

// ================================
// HEALTHCHECK
// ================================
exports.healthcheck = onRequest((req, res) => {
  res.send("Functions v2 OK");
});

// ================================
// PEDIDO CREADO → MAIL AL ADMIN
// ================================
exports.onPedidoCreado = onDocumentCreated(
  "pedidos/{pedidoId}",
  async (event) => {
    const pedido = event.data?.data();

    if (!pedido) {
      console.log("Pedido vacío, se cancela");
      return;
    }

    console.log("Nuevo pedido recibido");
    console.log("Cliente:", pedido.cliente?.nombre);

const html = `
  <h2>📦 Nuevo pedido recibido</h2>

  <p>
    <strong>Pedido Nº:</strong>
    #${String(pedido.numeroPedido).padStart(6, "0")}
  </p>

  <h3>👤 Datos del cliente</h3>
  <p><strong>Nombre:</strong> ${pedido.cliente.nombre}</p>
  <p><strong>Email:</strong> ${pedido.cliente.email}</p>
  <p><strong>Teléfono:</strong> ${pedido.cliente.telefono}</p>

  <h3>🧺 Productos</h3>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
    <tr>
      <th>Producto</th>
      <th>Cantidad</th>
    </tr>
    <tr><td>Medialuna por bandeja</td><td>${pedido.productos.medialunaBandeja}</td></tr>
    <tr><td>Surtidas por bandeja</td><td>${pedido.productos.surtidasBandeja}</td></tr>
    <tr><td>Medialuna de grasa</td><td>${pedido.productos.medialunaGrasa}</td></tr>
    <tr><td>Medialuna de manteca</td><td>${pedido.productos.medialunaManteca}</td></tr>
    <tr><td>Frola de membrillo</td><td>${pedido.productos.frolaMembrillo}</td></tr>
    <tr><td>Frola de batata</td><td>${pedido.productos.frolaBatata}</td></tr>
    <tr><td>Ricota</td><td>${pedido.productos.ricota}</td></tr>
    <tr><td>Ricota con DDL</td><td>${pedido.productos.ricotaDDL}</td></tr>
  </table>

  <h3>📝 Notas</h3>
  <p>${pedido.notas || "— Sin notas —"}</p>

  <h3>📅 Información del pedido</h3>
  <p><strong>Fecha de creación:</strong>
    ${pedido.fechaCreacion.toDate().toLocaleString()}
  </p>
  <p><strong>Entrega solicitada:</strong>
    ${pedido.entrega.fecha} ${pedido.entrega.hora}
  </p>

  <p><strong>Estado:</strong> ${pedido.estado}</p>

  <br>

  <a href="https://TU_DOMINIO/admin.html">
    👉 Ir al panel de administración
  </a>
`;


    try {
      await transporter.sendMail({
        from: `"Pedidos" <${process.env.GMAIL_EMAIL}>`,
        to: process.env.GMAIL_EMAIL,
        subject: "📦 Nuevo pedido recibido",
        html,
      });

      console.log("Mail enviado al admin");
    } catch (error) {
      console.error("Error enviando mail:", error);
    }
  }
);
