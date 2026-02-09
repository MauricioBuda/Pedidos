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

      <p><strong>Cliente:</strong> ${pedido.cliente.nombre}</p>
      <p><strong>Email:</strong> ${pedido.cliente.email}</p>
      <p><strong>Teléfono:</strong> ${pedido.cliente.telefono}</p>

      <h3>Productos</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr>
          <th>Manteca</th>
          <th>Grasa</th>
          <th>Facturas</th>
        </tr>
        <tr>
          <td>${pedido.productos.manteca}</td>
          <td>${pedido.productos.grasa}</td>
          <td>${pedido.productos.facturas}</td>
        </tr>
      </table>

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
