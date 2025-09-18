import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("📩 Stripe Event Received:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  let session;
  switch (event.type) {
    case "checkout.session.completed":
      session = event.data.object;
      console.log("✅ Checkout session completed:", session.id);
      break;

    case "payment_intent.succeeded":
      session = event.data.object;
      console.log("✅ Payment intent succeeded:", session.id);
      break;

    default:
      console.warn("⚠️ Unhandled event type:", event.type);
      return res.sendStatus(200);
  }

  // ✅ Extract bookingId safely
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error("❌ No bookingId in metadata:", session.id);
    return res.status(400).send("No bookingId in metadata");
  }
  console.log("🔑 BookingId found:", bookingId);

  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        isPaid: true,
        status: "confirmed",
        paymentMethod: "Stripe",
      },
      { new: true }
    );

    if (!updatedBooking) {
      console.error("❌ Booking not found in DB:", bookingId);
    } else {
      console.log("✅ Booking updated successfully:", updatedBooking._id);
    }
  } catch (err) {
    console.error("🔥 Error updating booking:", err.message);
  }

  res.sendStatus(200);
};
