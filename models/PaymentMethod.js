const paymentMethodSchema = mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'Credit Card', 'PayPal'
    cardLast4Digits: String,
    cardType: String, // e.g., 'Visa', 'MasterCard'
    expirationDate: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  });
  
  const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);
  export default PaymentMethod;
  