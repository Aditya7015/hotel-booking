// import Stripe from 'stripe';
// import Booking from '../models/Booking.js';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const stripeWebhooks = async (req, res) => {
//   const sig = req.headers['stripe-signature'];

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     console.error('Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object;

//         // bookingId from metadata
//         const bookingId = session.metadata?.bookingId;
//         if (!bookingId) {
//           console.warn('checkout.session.completed received but no bookingId in metadata');
//           break;
//         }

//         // Update booking as paid
//         await Booking.findByIdAndUpdate(
//           bookingId,
//           { isPaid: true, paymentMethod: 'Stripe', status: 'confirmed' },
//           { new: true }
//         );

//         console.log(`Booking ${bookingId} marked as paid.`);
//         break;
//       }

//       default:
//         console.log(`Unhandled event type: ${event.type}`);
//     }

//     res.json({ received: true });
//   } catch (error) {
//     console.error('Error handling webhook:', error);
//     res.status(500).send('Webhook handler failed');
//   }
// };


// // import Stripe from "stripe";
// // import Booking from "../models/Booking.js";

// // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// // export const stripeWebhooks = async (req, res) => {
// //   const sig = req.headers["stripe-signature"];

// //   try {
// //     // Construct event with raw body
// //     const event = stripe.webhooks.constructEvent(
// //       req.body,
// //       sig,
// //       process.env.STRIPE_WEBHOOK_SECRET
// //     );

// //     console.log("🔔 Stripe event received:", event.type);

// //     // Only handle checkout.session.completed
// //     if (event.type === "checkout.session.completed") {
// //       const session = event.data.object;
// //       console.log("📌 Session object:", session);

// //       const bookingId = session.metadata?.bookingId;
// //       if (!bookingId) {
// //         console.error("❌ No bookingId found in metadata");
// //         return res.status(400).send("No bookingId in metadata");
// //       }

// //       // Update booking in MongoDB
// //       const updatedBooking = await Booking.findByIdAndUpdate(
// //         bookingId,
// //         {
// //           paymentStatus: "paid",
// //           paymentIntent: session.payment_intent,
// //         },
// //         { new: true }
// //       );

// //       if (!updatedBooking) {
// //         console.error("❌ Booking not found:", bookingId);
// //       } else {
// //         console.log("✅ Booking updated:", updatedBooking);
// //       }
// //     }

// //     res.sendStatus(200);
// //   } catch (err) {
// //     console.error("❌ Stripe webhook error:", err.message);
// //     return res.status(400).send(`Webhook Error: ${err.message}`);
// //   }
// // };


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
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) {
        console.error("❌ No bookingId in metadata");
        return res.status(400).send("No bookingId in metadata");
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          isPaid: true,                 // ✅ matches your schema
          status: "confirmed",          // ✅ matches enum
          paymentMethod: "Stripe",      // ✅ matches schema
        },
        { new: true }
      );

      if (!updatedBooking) {
        console.error("❌ Booking not found:", bookingId);
      } else {
        console.log("✅ Booking updated:", updatedBooking._id);
      }
    } catch (err) {
      console.error("🔥 Error updating booking:", err.message);
    }
  }

  res.sendStatus(200);
};
