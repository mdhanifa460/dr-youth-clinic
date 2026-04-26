import mongoose from "mongoose";



const BookingSchema = new mongoose.Schema(
  {
    bookingId: String,
    name: String,
    phone: String,
    formattedPhone: String,
    service: String,
    location: String,
    date: String,
    time: String,
    concern: String,
    status: {
      type: String,
      default: "new",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
