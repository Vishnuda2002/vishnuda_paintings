import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import crypto from "node:crypto";

initializeApp();
const db = getFirestore();
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

function shippingFor(state) {
  if (state === "Tamil Nadu") return 4000;
  if (state === "International") {
    throw new HttpsError("failed-precondition", "International shipping must be quoted before payment.");
  }
  if (state === "Other / Union Territory") return 12000;
  const supported = ["Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Other Indian state"];
  if (supported.includes(state)) return 10000;
  throw new HttpsError("invalid-argument", "Choose a valid delivery region.");
}

function getRazorpay() {
  return new Razorpay({
    key_id: razorpayKeyId.value(),
    key_secret: razorpayKeySecret.value(),
  });
}

function validateCustomer(customer) {
  if (!customer || typeof customer.name !== "string" || customer.name.trim().length < 2 ||
      typeof customer.phone !== "string" || !/^[0-9 +()-]{8,18}$/.test(customer.phone) ||
      typeof customer.address !== "string" || customer.address.trim().length < 5 ||
      typeof customer.city !== "string" || customer.city.trim().length < 2 ||
      typeof customer.postalCode !== "string" || !/^[0-9]{6}$/.test(customer.postalCode) ||
      typeof customer.deliveryState !== "string") {
    throw new HttpsError("invalid-argument", "Please provide valid delivery details.");
  }
}

export const createRazorpayOrder = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret], region: "asia-south1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in before checkout.");
    const { customer, items } = request.data || {};
    validateCustomer(customer);
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      throw new HttpsError("invalid-argument", "Your cart is empty or too large.");
    }

    const orderItems = [];
    let subtotalPaise = 0;
    for (const item of items) {
      const id = String(item?.productId || "");
      const qty = Number(item?.quantity);
      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        throw new HttpsError("invalid-argument", "Invalid cart item.");
      }
      let product;
      const snap = await db.collection("products").doc(id).get();
      if (snap.exists) {
        const p = snap.data();
        if (Number(p.stock) < qty) throw new HttpsError("failed-precondition", `${p.title || "An item"} is out of stock.`);
        product = { title: String(p.title || "Painting"), price: Number(p.price), image: String(p.image || ""), stock: Number(p.stock) };
      } else {
        throw new HttpsError("not-found", "A painting in your cart is no longer available. Refresh the store.");
      }
      if (!Number.isFinite(product.price) || product.price < 1 || product.price > 10000000) {
        throw new HttpsError("failed-precondition", "A painting has an invalid price.");
      }
      subtotalPaise += Math.round(product.price * 100) * qty;
      orderItems.push({ productId: id, title: product.title, price: product.price, quantity: qty, image: product.image });
    }

    const shippingPaise = shippingFor(customer.deliveryState);
    const totalPaise = subtotalPaise + shippingPaise;
    if (totalPaise < 100 || totalPaise > 50000000) {
      throw new HttpsError("failed-precondition", "The checkout total is outside the supported range.");
    }

    const rp = getRazorpay();
    const rpOrder = await rp.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `vps_${Date.now()}_${request.auth.uid.slice(0, 8)}`,
      notes: { firebaseUid: request.auth.uid, customerEmail: request.auth.token.email || "" },
    });

    const orderRef = await db.collection("orders").add({
      userId: request.auth.uid,
      customerName: customer.name.trim(),
      customerEmail: request.auth.token.email || "",
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      city: customer.city.trim(),
      postalCode: customer.postalCode,
      deliveryState: customer.deliveryState,
      shippingFee: shippingPaise / 100,
      subtotal: subtotalPaise / 100,
      items: orderItems,
      total: totalPaise / 100,
      status: "Awaiting online payment",
      paymentMethod: "Razorpay",
      paymentStatus: "Not paid",
      razorpayOrderId: rpOrder.id,
      createdAt: FieldValue.serverTimestamp(),
      trackingNumber: "",
    });

    return {
      orderId: orderRef.id,
      razorpayOrderId: rpOrder.id,
      amount: totalPaise,
      currency: "INR",
      keyId: razorpayKeyId.value(),
      storeName: "Vishnuda Paintings Store",
      customerName: customer.name.trim(),
      customerEmail: request.auth.token.email || "",
      customerPhone: customer.phone.trim(),
    };
  }
);

export const verifyRazorpayPayment = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret], region: "asia-south1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in to verify payment.");
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.data || {};
    if (![orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === "string" && v.length > 0)) {
      throw new HttpsError("invalid-argument", "Missing Razorpay payment verification fields.");
    }
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists || orderSnap.data().userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Order not found for this account.");
    }
    const order = orderSnap.data();
    if (order.razorpayOrderId !== razorpay_order_id) {
      throw new HttpsError("permission-denied", "The payment order does not match.");
    }

    const expected = crypto.createHmac("sha256", razorpayKeySecret.value())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(razorpay_signature, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpsError("permission-denied", "Payment signature verification failed.");
    }

    const rp = getRazorpay();
    let payment = await rp.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.amount !== Math.round(Number(order.total) * 100)) {
      throw new HttpsError("failed-precondition", "Payment amount or order ID does not match.");
    }
    if (payment.status === "authorized") {
      payment = await rp.payments.capture(razorpay_payment_id, payment.amount, "INR");
    }
    if (payment.status !== "captured") {
      throw new HttpsError("failed-precondition", `Payment is not captured (status: ${payment.status}).`);
    }

    await orderRef.update({
      paymentStatus: "Paid",
      status: "Order received",
      razorpayPaymentId: razorpay_payment_id,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, orderId, message: "Payment verified successfully." };
  }
);
