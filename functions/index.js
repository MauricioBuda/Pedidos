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
  <h2>📦 PEDIDO: </h2>

  <p><strong>Pedido Nº:</strong> ${String(pedido.numeroPedido).padStart(6, "0")}</p>

  <p><strong>Cliente:</strong> ${pedido.cliente.nombre}</p>
  <p><strong>Email:</strong> ${pedido.cliente.email}</p>
  <p><strong>Teléfono:</strong> ${pedido.cliente.telefono}</p>

  <h3>Productos</h3>
  <ul>
    <li>Medialuna bandeja: ${pedido.productos.medialunaBandeja}</li>
    <li>Surtidas bandeja: ${pedido.productos.surtidasBandeja}</li>
    <li>Medialuna grasa: ${pedido.productos.medialunaGrasa}</li>
    <li>Medialuna manteca: ${pedido.productos.medialunaManteca}</li>
    <li>Frola membrillo: ${pedido.productos.frolaMembrillo}</li>
    <li>Frola batata: ${pedido.productos.frolaBatata}</li>
    <li>Ricota: ${pedido.productos.ricota}</li>
    <li>Ricota c/ DDL: ${pedido.productos.ricotaDDL}</li>
  </ul>

  <p><strong>Entrega:</strong> ${pedido.entrega.fecha} ${pedido.entrega.hora}</p>
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
