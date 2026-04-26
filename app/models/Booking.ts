import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: String,
    phone: String,
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
