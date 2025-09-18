import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Stripe from "stripe";


// Function to Check Availability of Room
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOut },
      checkOutDate: { $gte: checkIn },
    });

    return bookings.length === 0;
  } catch (error) {
    return false;
  }
};

// API to check availability of room
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, isAvailable: false, message: error.message });
  }
};

// API to create a new booking
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests } = req.body;
    const user = req.user._id; // Clerk user ID

    // Check room availability
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    const roomData = await Room.findById(room).populate("hotel");

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));
    const totalPrice = roomData.pricePerNight * nights;

    // Create booking
    const newBooking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalPrice,
    });

    // Send Email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: req.user.email,
      subject: "Hotel Booking Details",
      html: `
        <h2>Your Booking Details</h2>
        <p>Dear ${req.user.username},</p>
        <p>Thank you for your booking! Here are your details:</p>
        <ul>
          <li><strong>Booking ID:</strong> ${newBooking._id}</li>
          <li><strong>Hotel Name:</strong> ${roomData.hotel.name}</li>
          <li><strong>Location:</strong> ${roomData.hotel.address}</li>
          <li><strong>Check-In:</strong> ${newBooking.checkInDate.toDateString()}</li>
          <li><strong>Check-Out:</strong> ${newBooking.checkOutDate.toDateString()}</li>
          <li><strong>Booking Amount:</strong> ${process.env.CURRENCY || "$"} ${newBooking.totalPrice}</li>
        </ul>
        <p>We look forward to welcoming you!</p>
        <p>If you need to make any changes, feel free to contact us.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Booking created successfully", booking: newBooking });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get all bookings for a user
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user })
      .populate("room hotel")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

// API to get all bookings for a hotel owner
export const getHotelBookings = async (req, res) => {
  try {
    // Use req.auth() instead of req.auth for Clerk
    const auth = req.auth();
    const hotel = await Hotel.findOne({ owner: auth.userId });
    if (!hotel) {
      return res.json({ success: false, message: "No Hotel found" });
    }

    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });

    // Dashboard Data
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};




// export const stripePayment = async (req, res) => {
//   try {
//     const { bookingId } = req.body;

//     const booking = await Booking.findById(bookingId);
//     const roomData = await Room.findById(booking.room).populate("hotel");
//     const totalPrice = booking.totalPrice;

//     const origin = req.headers.origin || "http://localhost:5173"; // fallback for dev
//     const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

//     // Create Checkout Session
//     const session = await stripeInstance.checkout.sessions.create({
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: { name: roomData.hotel.name },
//             unit_amount: totalPrice * 100,
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${origin}/loader/my-bookings`,
//       cancel_url: `${origin}/my-bookings`,
//       metadata: { bookingId },
//     });

//     res.json({ success: true, url: session.url });
//   } catch (error) {
//     console.error("Stripe Error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// // export const stripePayment = async (req, res) => {
// //   try {
// //     const { bookingId } = req.body;

// //     console.log("🎟️ stripePayment called with bookingId:", bookingId);

// //     const booking = await Booking.findById(bookingId);
// //     if (!booking) {
// //       console.error("❌ Booking not found in DB for ID:", bookingId);
// //       return res.status(404).json({ success: false, message: "Booking not found" });
// //     }

// //     const roomData = await Room.findById(booking.room).populate("hotel");
// //     console.log("🏨 Room + Hotel fetched:", roomData?.hotel?.name);

// //     const totalPrice = booking.totalPrice;
// //     console.log("💵 Total Price for booking:", totalPrice);

// //     const origin = req.headers.origin || "http://localhost:5173"; 
// //     const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// //     const session = await stripeInstance.checkout.sessions.create({
// //       line_items: [
// //         {
// //           price_data: {
// //             currency: "usd",
// //             product_data: { name: roomData.hotel.name },
// //             unit_amount: totalPrice * 100,
// //           },
// //           quantity: 1,
// //         },
// //       ],
// //       mode: "payment",
// //       success_url: `${origin}/loader/my-bookings`,
// //       cancel_url: `${origin}/my-bookings`,
// //       metadata: { bookingId },
// //     });

// //     console.log("✅ Stripe checkout session created:", session.id, "for booking:", bookingId);

// //     res.json({ success: true, url: session.url });
// //   } catch (error) {
// //     console.error("🔥 Stripe Error in stripePayment:", error);
// //     res.status(500).json({ success: false, message: error.message });
// //   }
// // };


export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log("🎟️ stripePayment called with bookingId:", bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error("❌ Booking not found in DB for ID:", bookingId);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    console.log("✅ Booking found:", booking._id, "Total Price:", booking.totalPrice);

    const roomData = await Room.findById(booking.room).populate("hotel");
    console.log("🏨 Room + Hotel fetched:", roomData?.hotel?.name);

    const totalPrice = booking.totalPrice;
    console.log("💵 Total Price for booking:", totalPrice);

    const origin = req.headers.origin || "http://localhost:5173";
    console.log("🌍 Origin for redirect URLs:", origin);

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: roomData.hotel.name },
            unit_amount: totalPrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: { bookingId }, // 👈 very important
    });

    console.log("✅ Stripe checkout session created:");
    console.log("   - Session ID:", session.id);
    console.log("   - URL:", session.url);
    console.log("   - Metadata:", session.metadata);

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("🔥 Stripe Error in stripePayment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
